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

    // PayHero callback structure
    const {
      status,
      external_reference,
      provider_reference,
      amount,
      phone_number
    } = payload;

    const isSuccess = status === 'SUCCESS' || status === 'SUCCESSFUL';

    if (isSuccess) {
      console.log('Payment successful:', { external_reference, provider_reference, amount });

      // Update loan_disbursements if this was a loan payment
      const { data: disbursement, error: disbursementError } = await supabase
        .from('loan_disbursements')
        .update({
          payment_verified: true,
          transaction_code: provider_reference || external_reference,
        })
        .eq('transaction_code', external_reference)
        .select()
        .single();

      if (disbursement && !disbursementError) {
        // Update the associated loan application to approved
        await supabase
          .from('loan_applications')
          .update({ status: 'approved' })
          .eq('id', disbursement.application_id);

        console.log('Loan application approved for:', disbursement.application_id);
      }

      // Check if this is a savings deposit
      const { data: deposit, error: depositError } = await supabase
        .from('savings_deposits')
        .update({
          verified: true,
          transaction_code: provider_reference || external_reference,
        })
        .eq('transaction_code', external_reference)
        .select()
        .single();

      if (deposit && !depositError) {
        // Update user savings balance
        const { data: existingSavings } = await supabase
          .from('user_savings')
          .select('balance')
          .eq('user_id', deposit.user_id)
          .single();

        if (existingSavings) {
          await supabase
            .from('user_savings')
            .update({ balance: existingSavings.balance + deposit.amount })
            .eq('user_id', deposit.user_id);
        } else {
          await supabase
            .from('user_savings')
            .insert({ user_id: deposit.user_id, balance: deposit.amount });
        }

        console.log('Savings deposit verified for user:', deposit.user_id);
      }
    } else {
      console.log('Payment failed or pending:', { status, external_reference });

      // Update disbursement as failed
      await supabase
        .from('loan_disbursements')
        .update({ payment_verified: false })
        .eq('transaction_code', external_reference);
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
