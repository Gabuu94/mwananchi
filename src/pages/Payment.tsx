import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Wallet, CheckCircle, Loader2, ArrowLeft, DollarSign, Sparkles, XCircle, MessageCircle, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

const DEFAULT_MIN_SAVINGS = 100;
const SUPPORT_WHATSAPP = "17608133694";

type PaymentStatus = 'idle' | 'initiating' | 'waiting' | 'success' | 'failed';

const Payment = () => {
  const [loanAmount, setLoanAmount] = useState<number | null>(null);
  const [savingsBalance, setSavingsBalance] = useState<number | null>(null);
  const [minSavingsBalance, setMinSavingsBalance] = useState(DEFAULT_MIN_SAVINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if this is a loan disbursement flow or just savings deposit
  const isLoanFlow = loanAmount !== null && loanAmount > 0;

  const fetchSavingsBalance = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("user_savings")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching savings:", error);
        setSavingsBalance(0);
      } else {
        setSavingsBalance(data?.balance || 0);
      }
    } catch (error) {
      console.error("Error:", error);
      setSavingsBalance(0);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    const amount = localStorage.getItem("selectedLoanAmount");
    if (amount) {
      setLoanAmount(parseInt(amount));
    }
    const requiredSavings = localStorage.getItem("requiredSavings");
    if (requiredSavings) {
      setMinSavingsBalance(parseInt(requiredSavings));
    }
    fetchSavingsBalance();
    fetchUserPhone();
  }, [fetchSavingsBalance]);

  // Real-time subscription for payment updates
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('payment-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'savings_deposits',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newRecord = payload.new as { verified: boolean; transaction_code: string; amount: number };
            
            // Check if this update matches our current payment reference
            if (paymentReference && newRecord.transaction_code === paymentReference) {
              if (newRecord.verified === true) {
                setPaymentStatus('success');
                fetchSavingsBalance();
                toast({
                  title: "Payment Successful!",
                  description: `KES ${newRecord.amount.toLocaleString()} has been added to your savings.`,
                });
              } else if (newRecord.verified === false && paymentStatus === 'waiting') {
                // Payment was explicitly marked as failed
                setPaymentStatus('failed');
                toast({
                  title: "Payment Failed",
                  description: "The transaction was not completed. Please try again.",
                  variant: "destructive",
                });
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'savings_deposits',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // Refresh balance when new deposit is added
            fetchSavingsBalance();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeSubscription();
    
    return () => {
      cleanup.then((cleanupFn) => cleanupFn?.());
    };
  }, [paymentReference, paymentStatus, toast, fetchSavingsBalance]);

  const fetchUserPhone = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Try to get phone from loan applications (whatsapp_number field)
      const { data } = await supabase
        .from("loan_applications")
        .select("whatsapp_number")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data?.whatsapp_number) {
        setPhoneNumber(data.whatsapp_number);
      }
    } catch (error) {
      console.error("Error fetching phone:", error);
    }
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent("Hello! I need help with my Mwananchi Credit account.");
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${message}`, '_blank');
  };

  const handleInitiateSTKPush = async () => {
    const amount = parseInt(depositAmount);
    
    if (!amount || amount < 100) {
      toast({
        title: "Invalid Amount",
        description: "Please enter at least KES 100",
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your M-Pesa phone number",
        variant: "destructive",
      });
      return;
    }

    setPaymentStatus('initiating');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const reference = `SAVE_${user.id.slice(0, 8)}_${Date.now()}`;

      // Create pending deposit record
      await supabase.from("savings_deposits").insert({
        user_id: user.id,
        amount: amount,
        mpesa_message: `STK Push initiated: ${reference}`,
        transaction_code: reference,
        verified: false,
      });

      // Call PayHero STK Push edge function
      const { data, error } = await supabase.functions.invoke('payhero-stk-push', {
        body: {
          phoneNumber: phoneNumber,
          amount: amount,
          reference: reference,
        },
      });

      if (error) throw error;

      if (data?.success) {
        // Track our own reference (stored in DB) so real-time updates match immediately
        setPaymentReference(reference);
        setPaymentStatus('waiting');
        toast({
          title: "Check Your Phone!",
          description: "Enter your M-Pesa PIN when prompted to complete payment.",
        });

        // Start polling for payment confirmation
        pollPaymentStatus(reference);
      } else {
        throw new Error(data?.error || 'Failed to initiate payment');
      }

    } catch (error) {
      console.error("STK Push error:", error);
      setPaymentStatus('failed');
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fallback polling with shorter duration since we have real-time updates
  const pollPaymentStatus = async (reference: string) => {
    let attempts = 0;
    const maxAttempts = 60; // Poll for 2 minutes as backup

    const poll = async () => {
      // Stop polling if payment already succeeded/failed via real-time
      if (paymentStatus === 'success' || paymentStatus === 'failed') {
        return;
      }
      
      attempts++;
      
      try {
        const { data } = await supabase
          .from("savings_deposits")
          .select("verified")
          .eq("transaction_code", reference)
          .maybeSingle();

        if (data?.verified === true) {
          setPaymentStatus('success');
          fetchSavingsBalance();
          toast({
            title: "Payment Successful!",
            description: "Your savings balance has been updated.",
          });
          return;
        }

        if (attempts < maxAttempts && paymentStatus === 'waiting') {
          setTimeout(poll, 2000);
        } else if (attempts >= maxAttempts) {
          // Payment might still be processing
          toast({
            title: "Still Processing",
            description: "Your payment is being processed. The page will update automatically when complete.",
          });
        }
      } catch (error) {
        console.error("Polling error:", error);
        if (attempts < maxAttempts && paymentStatus === 'waiting') {
          setTimeout(poll, 2000);
        }
      }
    };

    setTimeout(poll, 3000);
  };

  const handleProceedWithLoan = async () => {
    if (savingsBalance === null || savingsBalance < minSavingsBalance) {
      toast({
        title: "Insufficient Savings",
        description: `You need at least KES ${minSavingsBalance.toLocaleString()} in savings to proceed`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const applicationId = localStorage.getItem("currentApplicationId");
      
      if (!user || !applicationId) {
        toast({
          title: "Error",
          description: "Session expired. Please start over.",
          variant: "destructive",
        });
        navigate("/application");
        return;
      }

      // Update application status to approved
      const { error: updateError } = await supabase
        .from("loan_applications")
        .update({ status: "approved" })
        .eq("id", applicationId)
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Update error:", updateError);
        toast({
          title: "Error",
          description: "Failed to process loan. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Create disbursement record
      const { error: disbursementError } = await supabase
        .from("loan_disbursements")
        .insert({
          application_id: applicationId,
          loan_amount: loanAmount,
          processing_fee: 0,
          transaction_code: `LOAN-${Date.now()}`,
          payment_verified: true,
        });

      if (disbursementError) {
        console.error("Disbursement error:", disbursementError);
      }

      // Clear localStorage
      localStorage.removeItem("currentApplicationId");
      localStorage.removeItem("mwananchiLoanLimit");
      localStorage.removeItem("selectedLoanAmount");
      localStorage.removeItem("processingFee");

      toast({
        title: "Loan Approved!",
        description: "Your loan is being disbursed to your M-Pesa number.",
      });

      setTimeout(() => {
        navigate("/dashboard");
      }, 2000);

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetPayment = () => {
    setPaymentStatus('idle');
    setPaymentReference(null);
    fetchSavingsBalance();
  };

  const hasSufficientSavings = savingsBalance !== null && savingsBalance >= minSavingsBalance;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-soft flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="container max-w-2xl mx-auto space-y-6">
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">
              {isLoanFlow ? "Secure Your Loan" : "Grow Your Savings"}
            </CardTitle>
            <CardDescription>
              {isLoanFlow 
                ? "A small savings deposit unlocks your loan instantly"
                : "Pay via M-Pesa STK Push - quick and secure!"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Savings Balance Card */}
            <div className="bg-gradient-to-br from-primary to-primary/80 p-6 rounded-xl text-primary-foreground">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4" />
                <p className="text-sm opacity-90">Your Savings Balance</p>
              </div>
              <p className="text-3xl font-bold">KES {(savingsBalance || 0).toLocaleString()}</p>
              {isLoanFlow && (
                <div className="mt-3 flex items-center gap-2">
                  {hasSufficientSavings ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Ready for your loan!</span>
                    </>
                  ) : (
                    <span className="text-sm opacity-80">Add KES {(minSavingsBalance - (savingsBalance || 0)).toLocaleString()} more to unlock</span>
                  )}
                </div>
              )}
            </div>

            {/* Loan Details - only show if in loan flow */}
            {isLoanFlow && (
              <div className="bg-muted/50 p-4 rounded-xl">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loan Amount:</span>
                  <span className="font-bold">KES {loanAmount?.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Payment Status Display */}
            {paymentStatus === 'success' && (
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl border-2 border-green-200 dark:border-green-800 text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-800/40 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-semibold text-green-700 dark:text-green-400">Payment Successful!</p>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    Your savings balance has been updated.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetPayment}>
                  Make Another Deposit
                </Button>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-xl border-2 border-red-200 dark:border-red-800 text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-800/40 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-400">Payment Failed</p>
                  <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                    Something went wrong. Please try again.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetPayment}>
                  Try Again
                </Button>
              </div>
            )}

            {/* Waiting for payment confirmation */}
            {paymentStatus === 'waiting' && (
              <div className="bg-primary/5 p-6 rounded-xl border-2 border-primary/20 text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-primary">Waiting for Payment</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please check your phone and enter your M-Pesa PIN to complete the payment.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetPayment}>
                  Cancel
                </Button>
              </div>
            )}

            {/* Show deposit form if idle and not enough savings OR not in loan flow */}
            {paymentStatus === 'idle' && (!hasSufficientSavings || !isLoanFlow) && (
              <>
                {/* Phone Number Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">M-Pesa Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="0712345678"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You'll receive an M-Pesa prompt on this number
                  </p>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Deposit Amount (KES)</label>
                  <Input
                    type="number"
                    placeholder={isLoanFlow && !hasSufficientSavings 
                      ? `Minimum KES ${(minSavingsBalance - (savingsBalance || 0)).toLocaleString()}` 
                      : "Enter amount (min KES 100)"
                    }
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min={100}
                  />
                </div>

                {/* Quick amount buttons */}
                <div className="flex flex-wrap gap-2">
                  {[500, 1000, 2000, 5000].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setDepositAmount(amount.toString())}
                      className={depositAmount === amount.toString() ? 'border-primary bg-primary/10' : ''}
                    >
                      KES {amount.toLocaleString()}
                    </Button>
                  ))}
                </div>

                <Button 
                  variant="cute" 
                  size="lg"
                  className="w-full"
                  onClick={handleInitiateSTKPush}
                  disabled={!depositAmount || !phoneNumber.trim()}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Pay via M-Pesa
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  You'll receive an M-Pesa prompt on your phone. Enter your PIN to complete payment.
                </p>
              </>
            )}

            {/* Show initiating state */}
            {paymentStatus === 'initiating' && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Sending M-Pesa prompt to your phone...</p>
              </div>
            )}

            {/* Show proceed button only in loan flow with sufficient savings */}
            {isLoanFlow && hasSufficientSavings && paymentStatus === 'idle' && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border-2 border-green-200 dark:border-green-800 flex gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-700 dark:text-green-400">You're All Set!</p>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      Your savings are ready. Tap below to get your loan disbursed instantly.
                    </p>
                  </div>
                </div>

                <Button 
                  variant="cute" 
                  size="lg"
                  className="w-full"
                  onClick={handleProceedWithLoan}
                >
                  Get My Loan - KES {loanAmount?.toLocaleString()}
                </Button>
              </div>
            )}

            {/* Apply for Loan button - only show when not in loan flow and idle */}
            {!isLoanFlow && paymentStatus === 'idle' && (
              <Button 
                variant="cute"
                className="w-full"
                onClick={() => navigate("/application")}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Apply for a Loan
              </Button>
            )}

            {paymentStatus === 'idle' && (
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => navigate(isLoanFlow ? "/loan-selection" : "/dashboard")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {isLoanFlow ? "Back to Loan Selection" : "Back to Dashboard"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Support Card */}
        <Card className="bg-card border-2 border-green-200 dark:border-green-800">
          <CardContent className="py-5">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="font-semibold text-foreground">Need Help?</p>
                <p className="text-sm text-muted-foreground">Chat with us on WhatsApp for instant support</p>
              </div>
              <Button 
                onClick={openWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Chat on WhatsApp
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
