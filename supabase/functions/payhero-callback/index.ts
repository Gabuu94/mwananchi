import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('PayHero callback received:', JSON.stringify(payload, null, 2));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // PayHero callback structure - the actual payment data is in the response object
    const response = payload.response || payload;
    const status = response.Status || response.status;
    const externalReference = response.ExternalReference || response.external_reference || payload.external_reference;
    const providerReference = response.MpesaReceiptNumber || response.provider_reference;
    const amount = response.Amount || response.amount;
    const resultDesc = response.ResultDesc || response.result_desc || '';

    console.log('Parsed callback data:', { status, externalReference, providerReference, amount, resultDesc });

    if (!externalReference) {
      console.error('No external reference found in callback');
      return new Response(
        JSON.stringify({ success: false, error: 'Missing external reference' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if payment was successful - PayHero uses "Success" or "Successful" status
    const isSuccess = status === 'Success' || status === 'Successful' || status === 'SUCCESS' || status === 'SUCCESSFUL';
    const isFailed = status === 'Failed' || status === 'FAILED' || status === 'Cancelled' || status === 'CANCELLED';

    console.log('Payment status check:', { isSuccess, isFailed, originalStatus: status });

    if (isSuccess && amount > 0) {
      console.log('Payment successful:', { externalReference, providerReference, amount });

      // Update savings_deposits - set verified to true
      const { data: deposit, error: depositError } = await supabase
        .from('savings_deposits')
        .update({
          verified: true,
          mpesa_message: providerReference
            ? `M-Pesa receipt: ${providerReference}`
            : 'Payment successful',
        })
        .eq('transaction_code', externalReference)
        .select()
        .single();

      if (deposit && !depositError) {
        console.log('Deposit verified:', deposit);
        
        // Update user savings balance
        const { data: existingSavings } = await supabase
          .from('user_savings')
          .select('balance')
          .eq('user_id', deposit.user_id)
          .single();

        if (existingSavings) {
          await supabase
            .from('user_savings')
            .update({ 
              balance: existingSavings.balance + deposit.amount,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', deposit.user_id);
          console.log('Savings balance updated for user:', deposit.user_id);
        } else {
          await supabase
            .from('user_savings')
            .insert({ user_id: deposit.user_id, balance: deposit.amount });
          console.log('New savings record created for user:', deposit.user_id);
        }
      } else {
        console.log('Deposit update result:', { deposit, depositError });
      }

      // Also check loan_disbursements
      const { data: disbursement, error: disbursementError } = await supabase
        .from('loan_disbursements')
        .update({
          payment_verified: true,
        })
        .eq('transaction_code', externalReference)
        .select()
        .single();

      if (disbursement && !disbursementError) {
        await supabase
          .from('loan_applications')
          .update({ status: 'approved' })
          .eq('id', disbursement.application_id);
        console.log('Loan application approved for:', disbursement.application_id);
      }

    } else if (isFailed) {
      console.log('Payment failed:', { status, externalReference, resultDesc });

      // Mark deposit as not verified (failed)
      const { error: updateError } = await supabase
        .from('savings_deposits')
        .update({
          verified: false,
          mpesa_message: resultDesc ? `Failed: ${resultDesc}` : 'Failed',
        })
        .eq('transaction_code', externalReference);
      
      if (updateError) {
        console.error('Error updating failed deposit:', updateError);
      } else {
        console.log('Deposit marked as failed for:', externalReference);
      }

      // Also update loan disbursements if applicable
      await supabase
        .from('loan_disbursements')
        .update({ payment_verified: false })
        .eq('transaction_code', externalReference);
    } else {
      console.log('Payment pending or unknown status:', { status, externalReference });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Callback processed' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error processing PayHero callback:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
