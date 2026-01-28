import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MpesaCallbackMetadata {
  Item: Array<{
    Name: string;
    Value?: string | number;
  }>;
}

interface MpesaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: MpesaCallbackMetadata;
    };
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const callback: MpesaCallback = await req.json();
    console.log('M-Pesa callback received:', JSON.stringify(callback));

    const { stkCallback } = callback.Body;
    const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = stkCallback;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find the transaction by checkout request ID
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference', CheckoutRequestID)
      .single();

    if (txError || !transaction) {
      console.error('Transaction not found for CheckoutRequestID:', CheckoutRequestID);
      return new Response(JSON.stringify({ success: false }), { 
        status: 200, // M-Pesa expects 200
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    if (ResultCode === 0) {
      // Payment successful
      let mpesaReceipt = '';
      let phoneNumber = '';
      let amount = transaction.amount;

      if (CallbackMetadata?.Item) {
        for (const item of CallbackMetadata.Item) {
          if (item.Name === 'MpesaReceiptNumber' && item.Value) {
            mpesaReceipt = String(item.Value);
          }
          if (item.Name === 'PhoneNumber' && item.Value) {
            phoneNumber = String(item.Value);
          }
          if (item.Name === 'Amount' && item.Value) {
            amount = Number(item.Value);
          }
        }
      }

      console.log(`Payment successful: Receipt ${mpesaReceipt}, Amount ${amount}, Phone ${phoneNumber}`);

      // Update transaction as completed
      await supabase
        .from('transactions')
        .update({
          status: 'completed',
          mpesa_receipt: mpesaReceipt,
          description: `M-Pesa deposit - Receipt: ${mpesaReceipt}`,
        })
        .eq('id', transaction.id);

      // Update user wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', transaction.user_id)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({ 
            balance: wallet.balance + amount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', transaction.user_id);
        
        console.log(`Wallet updated for user ${transaction.user_id}: +${amount}`);
      }
    } else {
      // Payment failed or cancelled
      console.log(`Payment failed/cancelled: ${ResultDesc}`);
      
      let status = 'failed';
      if (ResultDesc.toLowerCase().includes('cancel') || ResultCode === 1032) {
        status = 'cancelled';
      }

      await supabase
        .from('transactions')
        .update({
          status,
          description: `M-Pesa: ${ResultDesc}`,
        })
        .eq('id', transaction.id);
    }

    // M-Pesa expects a success response
    return new Response(JSON.stringify({ 
      ResultCode: 0,
      ResultDesc: 'Callback processed successfully'
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error);
    return new Response(JSON.stringify({ 
      ResultCode: 0,
      ResultDesc: 'Callback received'
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
