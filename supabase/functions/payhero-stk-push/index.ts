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
    const { phoneNumber, amount, applicationId, reference } = await req.json();

    console.log('PayHero STK Push request received:', { phoneNumber, amount, applicationId, reference });

    // Validate input
    if (!phoneNumber || !amount) {
      throw new Error('Missing required fields: phoneNumber or amount');
    }

    // Format phone number for PayHero (must be in format 2547XXXXXXXX)
    let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    console.log('Formatted phone:', formattedPhone);

    // Get PayHero credentials
    const payheroApiKey = Deno.env.get('PAYHERO_API_KEY');
    const payheroChannelId = Deno.env.get('PAYHERO_CHANNEL_ID');

    if (!payheroApiKey || !payheroChannelId) {
      throw new Error('PayHero credentials not configured');
    }

    // PayHero uses Basic Auth - the API key should be base64 encoded
    // If user provided raw credentials (username:password), encode them
    // If already base64 encoded, use as-is
    let authHeader = payheroApiKey;
    
    // Check if it looks like it's not base64 (contains colon = raw credentials)
    if (payheroApiKey.includes(':')) {
      // Raw credentials format: username:password - encode to base64
      authHeader = btoa(payheroApiKey);
    }
    // If no colon, assume it's already base64 encoded or just the token

    // Generate unique reference
    const txReference = reference || `MWANANCHI_${Date.now()}`;

    // PayHero STK Push payload
    const stkPayload = {
      amount: Math.floor(amount),
      phone_number: formattedPhone,
      channel_id: parseInt(payheroChannelId),
      provider: "m-pesa",
      external_reference: txReference,
      callback_url: `https://tflvmwotbqrckywnuexd.supabase.co/functions/v1/payhero-callback`
    };

    console.log('PayHero STK payload:', stkPayload);
    console.log('Using auth header (masked):', authHeader.substring(0, 10) + '...');

    // Send STK Push request to PayHero
    const stkResponse = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPayload),
    });

    const stkResult = await stkResponse.json();
    console.log('PayHero STK response:', stkResult);

    if (!stkResponse.ok) {
      throw new Error(stkResult.message || stkResult.error || 'Failed to initiate STK Push');
    }

    // If applicationId provided, create tracking record
    if (applicationId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabase.from('loan_disbursements').insert({
        application_id: applicationId,
        loan_amount: amount,
        processing_fee: amount,
        transaction_code: txReference,
        payment_verified: false,
        disbursed: false,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push sent successfully. Check your phone for the M-Pesa prompt.',
        reference: txReference,
        payheroReference: stkResult.reference || stkResult.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in PayHero STK Push:', error);
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
