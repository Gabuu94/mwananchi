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
    const { phoneNumber, amount, applicationId } = await req.json();

    console.log('Paystack STK Push request received:', { phoneNumber, amount, applicationId });

    // Validate input
    if (!phoneNumber || !amount || !applicationId) {
      throw new Error('Missing required fields: phoneNumber, amount, or applicationId');
    }

    // Format phone number for Paystack (must be in format +254XXXXXXXXX)
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('254')) {
      formattedPhone = '+' + formattedPhone;
    } else if (!formattedPhone.startsWith('+254')) {
      formattedPhone = '+254' + formattedPhone;
    }

    console.log('Formatted phone:', formattedPhone);

    // Get Paystack secret key
    const paystackSecretKey = Deno.env.get('PAYSTACK_SECRET_KEY');

    if (!paystackSecretKey) {
      throw new Error('Paystack credentials not configured');
    }

    // Generate unique reference
    const reference = `hela_${applicationId}_${Date.now()}`;

    // Initialize Paystack Mobile Money charge
    const chargePayload = {
      email: `${formattedPhone.replace('+', '')}@helapesa.com`, // Paystack requires email
      amount: Math.floor(amount * 100), // Paystack uses smallest currency unit (cents)
      currency: 'KES',
      mobile_money: {
        phone: formattedPhone,
        provider: 'mpesa'
      },
      reference: reference,
      metadata: {
        application_id: applicationId,
        custom_fields: [
          {
            display_name: "Application ID",
            variable_name: "application_id",
            value: applicationId
          }
        ]
      }
    };

    console.log('Paystack charge payload:', { ...chargePayload, email: '[REDACTED]' });

    // Send charge request to Paystack
    const chargeResponse = await fetch(
      'https://api.paystack.co/charge',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chargePayload),
      }
    );

    const chargeResult = await chargeResponse.json();
    console.log('Paystack charge response:', chargeResult);

    if (!chargeResult.status) {
      throw new Error(chargeResult.message || 'Failed to initiate payment');
    }

    // Store the reference for tracking
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update or create a tracking record
    await supabase.from('loan_disbursements').insert({
      application_id: applicationId,
      loan_amount: amount,
      processing_fee: amount,
      transaction_code: reference,
      payment_verified: false,
      disbursed: false,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push sent successfully. Check your phone for the M-Pesa prompt.',
        reference: reference,
        paystackReference: chargeResult.data?.reference,
        displayText: chargeResult.data?.display_text || 'Please enter your M-Pesa PIN when prompted',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in Paystack STK Push:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
