import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Smartphone, ArrowLeft, CheckCircle, XCircle, AlertCircle, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const MIN_DEPOSIT = 200; // Minimum deposit limit
const MAX_DEPOSIT = 100000;

type DepositStatus = 'idle' | 'initiating' | 'waiting' | 'completed' | 'failed' | 'cancelled';

export default function Deposit() {
  const { user, loading: authLoading } = useAuth();
  const { refreshWallet } = useWallet();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [amount, setAmount] = useState(MIN_DEPOSIT);
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<DepositStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [mpesaReceipt, setMpesaReceipt] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Poll for transaction status
  const pollTransactionStatus = useCallback(async (txId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max wait
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setStatus('failed');
        setStatusMessage('Request timed out. Please check your M-Pesa messages.');
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await supabase.functions.invoke('mpesa-query', {
          body: { transactionId: txId },
        });

        if (response.error) {
          console.error('Poll error:', response.error);
          attempts++;
          setTimeout(poll, 2000);
          return;
        }

        const { status: txStatus, mpesaReceipt: receipt, description } = response.data;

        if (txStatus === 'completed') {
          setStatus('completed');
          setMpesaReceipt(receipt);
          setStatusMessage('Payment received successfully!');
          refreshWallet();
          toast({
            title: '✅ Deposit Successful!',
            description: `KES ${amount} has been added to your wallet.`,
          });
        } else if (txStatus === 'failed') {
          setStatus('failed');
          setStatusMessage(description || 'Payment failed. Please try again.');
        } else if (txStatus === 'cancelled') {
          setStatus('cancelled');
          setStatusMessage('Payment was cancelled.');
        } else {
          // Still pending
          attempts++;
          setTimeout(poll, 2000);
        }
      } catch (error) {
        console.error('Polling error:', error);
        attempts++;
        setTimeout(poll, 2000);
      }
    };

    poll();
  }, [amount, refreshWallet, toast]);

  const initiateDeposit = async () => {
    if (!phone || phone.length < 9) {
      toast({
        title: 'Invalid phone number',
        description: 'Please enter a valid M-Pesa phone number.',
        variant: 'destructive',
      });
      return;
    }

    if (amount < MIN_DEPOSIT) {
      toast({
        title: 'Minimum deposit is KES ' + MIN_DEPOSIT,
        description: `Please enter an amount of at least KES ${MIN_DEPOSIT}.`,
        variant: 'destructive',
      });
      return;
    }

    setStatus('initiating');
    setStatusMessage('Creating deposit request...');

    try {
      // Create pending transaction
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: user!.id,
          type: 'deposit',
          amount: amount,
          status: 'pending',
          description: `M-Pesa deposit from ${phone}`,
        })
        .select()
        .single();

      if (txError) throw txError;

      setTransactionId(tx.id);
      setStatusMessage('Sending STK Push to your phone...');

      // Call the M-Pesa STK Push edge function
      const { data: stkResponse, error: stkError } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phone: phone,
          amount: amount,
          transactionId: tx.id,
        },
      });

      if (stkError) {
        console.error('STK Push error:', stkError);
        setStatus('failed');
        setStatusMessage(stkError.message || 'Failed to send STK Push. Please try again.');
        
        // Update transaction as failed
        await supabase.from('transactions').update({ status: 'failed' }).eq('id', tx.id);
        return;
      }

      if (!stkResponse.success) {
        setStatus('failed');
        setStatusMessage(stkResponse.error || 'Failed to initiate payment.');
        return;
      }

      // STK Push sent successfully
      setStatus('waiting');
      setStatusMessage('Please enter your M-Pesa PIN on your phone');

      // Start polling for status
      pollTransactionStatus(tx.id);

    } catch (error) {
      console.error('Error initiating deposit:', error);
      setStatus('failed');
      setStatusMessage('Failed to initiate deposit. Please try again.');
    }
  };

  const resetDeposit = () => {
    setStatus('idle');
    setStatusMessage('');
    setTransactionId(null);
    setMpesaReceipt(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const quickAmounts = [200, 500, 1000, 2000, 5000];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-md">
          <Button variant="ghost" className="mb-6" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Back to Dashboard
          </Button>

          {/* Bonus Unlock Banner */}
          {settings?.welcome_bonus_enabled && (
            <Card className="glass-card mb-6 border-accent/30 bg-gradient-to-r from-accent/10 to-primary/10 overflow-hidden">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center animate-bounce">
                  <Gift className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-accent">🎁 Unlock KES {settings.welcome_bonus_amount} Bonus!</p>
                  <p className="text-sm text-muted-foreground">Make your first deposit to claim</p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="glass-card overflow-hidden">
            <CardHeader className="text-center border-b border-border/50 bg-gradient-to-r from-primary/10 to-accent/10">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Smartphone className="w-10 h-10 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Deposit via M-Pesa</CardTitle>
              <CardDescription>
                Add funds instantly using M-Pesa Express
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {status === 'idle' && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-base font-medium">Amount (KES)</Label>
                      <span className="text-xs text-muted-foreground">Min: KES {MIN_DEPOSIT}</span>
                    </div>
                    <Input
                      type="number"
                      min={MIN_DEPOSIT}
                      max={MAX_DEPOSIT}
                      value={amount || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setAmount(0);
                        } else {
                          const num = parseInt(val, 10);
                          if (!isNaN(num)) {
                            setAmount(Math.min(MAX_DEPOSIT, num));
                          }
                        }
                      }}
                      onBlur={() => {
                        if (amount < MIN_DEPOSIT) {
                          setAmount(MIN_DEPOSIT);
                        }
                      }}
                      className="text-lg h-12"
                    />
                    <div className="flex flex-wrap gap-2 mt-3">
                      {quickAmounts.map((amt) => (
                        <Button
                          key={amt}
                          variant={amount === amt ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setAmount(amt)}
                          className="flex-1 min-w-[60px]"
                        >
                          {amt}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-medium">M-Pesa Phone Number</Label>
                    <Input
                      type="tel"
                      placeholder="0712345678 or 254712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))}
                      className="text-lg h-12"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the phone number registered with M-Pesa
                    </p>
                  </div>

                  <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Deposit Amount</span>
                      <span>KES {amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Transaction Fee</span>
                      <span className="text-primary">FREE</span>
                    </div>
                    <div className="border-t border-border/50 pt-2 mt-2">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span className="text-primary">KES {amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" 
                    size="lg"
                    onClick={initiateDeposit}
                    disabled={amount < MIN_DEPOSIT}
                  >
                    <Smartphone className="mr-2 w-5 h-5" />
                    Deposit KES {amount}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Minimum deposit: KES {MIN_DEPOSIT}
                  </p>
                </>
              )}

              {status === 'initiating' && (
                <div className="text-center py-12">
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                    <Smartphone className="absolute inset-0 m-auto w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Initiating Payment</h3>
                  <p className="text-muted-foreground">{statusMessage}</p>
                </div>
              )}

              {status === 'waiting' && (
                <div className="text-center py-12">
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-accent animate-pulse"></div>
                    <div className="absolute inset-2 rounded-full bg-background flex items-center justify-center">
                      <Smartphone className="w-10 h-10 text-primary animate-bounce" />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Check Your Phone!</h3>
                  <p className="text-muted-foreground mb-4">{statusMessage}</p>
                  <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 text-sm">
                    <p className="text-accent font-medium">📱 An M-Pesa prompt has been sent</p>
                    <p className="text-muted-foreground mt-1">Enter your PIN to complete the payment</p>
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span>Waiting for confirmation</span>
                  </div>
                </div>
              )}

              {status === 'completed' && (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/30">
                    <CheckCircle className="w-12 h-12 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold text-primary mb-2">Payment Successful!</h3>
                  <p className="text-muted-foreground mb-4">{statusMessage}</p>
                  
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6">
                    <div className="flex justify-between mb-2">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-semibold">KES {amount}</span>
                    </div>
                    {mpesaReceipt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Receipt</span>
                        <span className="font-mono text-sm">{mpesaReceipt}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={resetDeposit}>
                      Deposit More
                    </Button>
                    <Button className="flex-1" onClick={() => navigate('/games')}>
                      Play Now
                    </Button>
                  </div>
                </div>
              )}

              {status === 'failed' && (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
                    <XCircle className="w-12 h-12 text-destructive" />
                  </div>
                  <h3 className="text-2xl font-bold text-destructive mb-2">Payment Failed</h3>
                  <p className="text-muted-foreground mb-6">{statusMessage}</p>
                  <Button className="w-full" onClick={resetDeposit}>
                    Try Again
                  </Button>
                </div>
              )}

              {status === 'cancelled' && (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-accent/20 flex items-center justify-center">
                    <AlertCircle className="w-12 h-12 text-accent" />
                  </div>
                  <h3 className="text-2xl font-bold text-accent mb-2">Payment Cancelled</h3>
                  <p className="text-muted-foreground mb-6">{statusMessage}</p>
                  <Button className="w-full" onClick={resetDeposit}>
                    Try Again
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
