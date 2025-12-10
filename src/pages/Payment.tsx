import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Wallet, CheckCircle, Loader2, ArrowLeft, DollarSign, Sparkles, Copy, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const MIN_SAVINGS_BALANCE = 500;
const TILL_NUMBER = "8071464";
const BUSINESS_NAME = "FINTECH HUB VENTURES 3";

type PaymentStatus = 'idle' | 'submitting' | 'success' | 'failed';

const Payment = () => {
  const [loanAmount, setLoanAmount] = useState<number | null>(null);
  const [savingsBalance, setSavingsBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState("");
  const [mpesaMessage, setMpesaMessage] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if this is a loan disbursement flow or just savings deposit
  const isLoanFlow = loanAmount !== null && loanAmount > 0;

  useEffect(() => {
    const amount = localStorage.getItem("selectedLoanAmount");
    if (amount) {
      setLoanAmount(parseInt(amount));
    }
    fetchSavingsBalance();
  }, []);

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

  const copyTillNumber = () => {
    navigator.clipboard.writeText(TILL_NUMBER);
    toast({
      title: "Copied!",
      description: "Till number copied to clipboard",
    });
  };

  const handleSubmitDeposit = async () => {
    const amount = parseInt(depositAmount);
    
    if (!amount || amount < 100) {
      toast({
        title: "Invalid Amount",
        description: "Please enter at least KES 100",
        variant: "destructive",
      });
      return;
    }

    if (!mpesaMessage.trim()) {
      toast({
        title: "M-Pesa Message Required",
        description: "Please paste your M-Pesa confirmation message",
        variant: "destructive",
      });
      return;
    }

    // Basic validation for M-Pesa message format
    if (!mpesaMessage.toLowerCase().includes('confirmed') && !mpesaMessage.toLowerCase().includes('mpesa')) {
      toast({
        title: "Invalid Message",
        description: "Please paste a valid M-Pesa confirmation message",
        variant: "destructive",
      });
      return;
    }

    setPaymentStatus('submitting');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Extract transaction code from M-Pesa message (usually starts with letters and followed by numbers)
      const transactionMatch = mpesaMessage.match(/[A-Z]{2,}[0-9A-Z]+/i);
      const transactionCode = transactionMatch ? transactionMatch[0].toUpperCase() : `DEP_${Date.now()}`;

      // Create deposit record (admin will verify)
      const { error } = await supabase
        .from("savings_deposits")
        .insert({
          user_id: user.id,
          amount: amount,
          mpesa_message: mpesaMessage,
          transaction_code: transactionCode,
          verified: false, // Admin will verify
        });

      if (error) throw error;

      setPaymentStatus('success');
      setMpesaMessage("");
      setDepositAmount("");

      toast({
        title: "Deposit Submitted!",
        description: "Your deposit is pending verification. We'll update your balance shortly.",
      });

    } catch (error) {
      console.error("Deposit error:", error);
      setPaymentStatus('failed');
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProceedWithLoan = async () => {
    if (savingsBalance === null || savingsBalance < MIN_SAVINGS_BALANCE) {
      toast({
        title: "Insufficient Savings",
        description: `You need at least KES ${MIN_SAVINGS_BALANCE} in savings to proceed`,
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
    fetchSavingsBalance();
  };

  const hasSufficientSavings = savingsBalance !== null && savingsBalance >= MIN_SAVINGS_BALANCE;

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
                : "Your savings journey starts here. Every shilling counts!"
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
                    <span className="text-sm opacity-80">Add KES {MIN_SAVINGS_BALANCE - (savingsBalance || 0)} more to unlock</span>
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
                  <p className="font-semibold text-green-700 dark:text-green-400">Deposit Submitted!</p>
                  <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                    Your deposit is pending verification by our team. We'll update your balance shortly.
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
                  <p className="font-semibold text-red-700 dark:text-red-400">Submission Failed</p>
                  <p className="text-sm text-red-600 dark:text-red-500 mt-1">
                    Something went wrong. Please try again.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetPayment}>
                  Try Again
                </Button>
              </div>
            )}

            {/* Show deposit form if idle and not enough savings OR not in loan flow */}
            {paymentStatus === 'idle' && (!hasSufficientSavings || !isLoanFlow) && (
              <>
                {/* Payment Instructions */}
                <div className="bg-primary/5 border-2 border-primary/20 p-5 rounded-xl space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    How to Deposit
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                      <p>Open M-Pesa on your phone and select <strong>Lipa na M-Pesa</strong></p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                      <p>Select <strong>Buy Goods and Services</strong></p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                      <div className="flex-1">
                        <p>Enter Till Number:</p>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="bg-card border-2 border-primary rounded-lg px-4 py-2 font-mono text-xl font-bold text-primary">
                            {TILL_NUMBER}
                          </div>
                          <Button variant="outline" size="sm" onClick={copyTillNumber}>
                            <Copy className="w-4 h-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Business Name: {BUSINESS_NAME}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                      <p>Enter the amount and complete the transaction</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">5</span>
                      <p>Paste the M-Pesa confirmation message below</p>
                    </div>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Amount Deposited (KES)</label>
                  <Input
                    type="number"
                    placeholder={isLoanFlow && !hasSufficientSavings 
                      ? `Minimum KES ${MIN_SAVINGS_BALANCE - (savingsBalance || 0)}` 
                      : "Enter amount (min KES 100)"
                    }
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min={100}
                  />
                </div>

                {/* M-Pesa Message Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">M-Pesa Confirmation Message</label>
                  <Textarea
                    placeholder="Paste your M-Pesa confirmation message here..."
                    value={mpesaMessage}
                    onChange={(e) => setMpesaMessage(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the full SMS you received from M-Pesa after payment
                  </p>
                </div>

                <Button 
                  variant="cute" 
                  size="lg"
                  className="w-full"
                  onClick={handleSubmitDeposit}
                  disabled={!depositAmount || !mpesaMessage.trim()}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Submit Deposit
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Your deposit will be verified by our team within a few minutes.
                </p>
              </>
            )}

            {/* Show processing state */}
            {paymentStatus === 'submitting' && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Submitting your deposit...</p>
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

        {/* Help Card */}
        <Card className="bg-card/50">
          <CardContent className="py-6">
            <p className="text-sm text-center text-muted-foreground">
              Need help? Contact us on WhatsApp: <strong className="text-foreground">0755440358</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;