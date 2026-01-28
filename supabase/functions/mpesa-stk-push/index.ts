import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface STKPushRequest {
  phone: string;
  amount: number;
  transactionId: string;
}

interface MpesaSettings {
  paybill_number: string;
  consumer_key: string;
  consumer_secret: string;
  passkey: string;
  is_sandbox: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !userData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const userId = userData.claims.sub;
    const { phone, amount, transactionId }: STKPushRequest = await req.json();

    console.log(`Processing STK push for user ${userId}, amount ${amount}, phone ${phone}`);

    // Get M-Pesa settings from admin configuration
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: mpesaSettings, error: settingsError } = await serviceClient
      .from('mpesa_settings')
      .select('*')
      .limit(1)
      .single();

    if (settingsError || !mpesaSettings) {
      console.error('M-Pesa settings not configured:', settingsError);
      return new Response(JSON.stringify({ 
        error: 'M-Pesa not configured',
        details: 'Please contact admin to configure M-Pesa settings'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const settings = mpesaSettings as MpesaSettings;
    
    if (!settings.consumer_key || !settings.consumer_secret || !settings.passkey || !settings.paybill_number) {
      return new Response(JSON.stringify({ 
        error: 'M-Pesa credentials incomplete',
        details: 'Please contact admin to complete M-Pesa configuration'
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Determine API endpoints based on sandbox mode
    const baseUrl = settings.is_sandbox 
      ? 'https://sandbox.safaricom.co.ke' 
      : 'https://api.safaricom.co.ke';

    // Step 1: Get OAuth token
    const auth = btoa(`${settings.consumer_key}:${settings.consumer_secret}`);
    
    console.log('Fetching OAuth token from:', `${baseUrl}/oauth/v1/generate`);
    
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('OAuth token error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'Failed to authenticate with M-Pesa',
        details: 'OAuth token generation failed'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    console.log('OAuth token obtained successfully');

    // Step 2: Prepare STK Push request
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = btoa(`${settings.paybill_number}${settings.passkey}${timestamp}`);
    
    // Format phone number (remove + and ensure starts with 254)
    let formattedPhone = phone.replace(/\+/g, '').replace(/^0/, '254');
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`;

    const stkPushPayload = {
      BusinessShortCode: settings.paybill_number,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: settings.paybill_number,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: 'gameplay',
      TransactionDesc: `Deposit ${transactionId.slice(0, 8)}`,
    };

    console.log('Sending STK Push request:', JSON.stringify({ ...stkPushPayload, Password: '[REDACTED]' }));

    const stkResponse = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPushPayload),
    });

    const stkResult = await stkResponse.json();
    console.log('STK Push response:', JSON.stringify(stkResult));

    if (stkResult.ResponseCode === '0') {
      // Update transaction with checkout request ID
      await serviceClient
        .from('transactions')
        .update({
          reference: stkResult.CheckoutRequestID,
          description: `M-Pesa STK Push initiated - ${formattedPhone}`,
        })
        .eq('id', transactionId);

      return new Response(JSON.stringify({
        success: true,
        message: 'STK Push sent successfully',
        checkoutRequestId: stkResult.CheckoutRequestID,
        merchantRequestId: stkResult.MerchantRequestID,
        responseDescription: stkResult.ResponseDescription,
      }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    } else {
      console.error('STK Push failed:', stkResult);
      
      // Update transaction as failed
      await serviceClient
        .from('transactions')
        .update({
          status: 'failed',
          description: `STK Push failed: ${stkResult.ResponseDescription || stkResult.errorMessage || 'Unknown error'}`,
        })
        .eq('id', transactionId);

      return new Response(JSON.stringify({
        success: false,
        error: stkResult.ResponseDescription || stkResult.errorMessage || 'STK Push failed',
        errorCode: stkResult.ResponseCode || stkResult.errorCode,
      }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  } catch (error) {
    console.error('Error in mpesa-stk-push:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
