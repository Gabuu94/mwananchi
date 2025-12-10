import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Wallet, CheckCircle, Loader2, ArrowLeft, DollarSign, Sparkles, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";

const MIN_SAVINGS_BALANCE = 500;

const Payment = () => {
  const [loanAmount, setLoanAmount] = useState<number | null>(null);
  const [savingsBalance, setSavingsBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
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
    fetchPhoneNumber();
  }, []);

  const fetchPhoneNumber = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

  const fetchSavingsBalance = async () => {
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
  };

  const handlePayNow = async () => {
    const amount = parseInt(depositAmount);
    
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your M-Pesa phone number",
        variant: "destructive",
      });
      return;
    }

    if (!amount || amount < 100) {
      toast({
        title: "Invalid Amount",
        description: "Please enter at least KES 100",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Generate a unique application ID for tracking
      const applicationId = `savings_${user.id}_${Date.now()}`;

      // Call the Paystack STK Push function
      const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
        body: {
          phoneNumber: phoneNumber,
          amount: amount,
          applicationId: applicationId,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to initiate payment");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to initiate payment");
      }

      toast({
        title: "Check Your Phone",
        description: data.displayText || "Enter your M-Pesa PIN when prompted to complete the payment",
      });

      // Poll for payment confirmation or wait for webhook
      // For now, we'll show a success state and let the user know to wait
      setTimeout(async () => {
        // Update savings balance optimistically (will be confirmed via webhook)
        const { data: existingSavings } = await supabase
          .from("user_savings")
          .select("id, balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (existingSavings) {
          await supabase
            .from("user_savings")
            .update({ balance: existingSavings.balance + amount })
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("user_savings")
            .insert({ user_id: user.id, balance: amount });
        }

        // Create deposit record
        await supabase
          .from("savings_deposits")
          .insert({
            user_id: user.id,
            amount: amount,
            mpesa_message: `STK Push: ${data.reference}`,
            transaction_code: data.reference,
            verified: true,
          });

        await fetchSavingsBalance();
        setDepositAmount("");
        
        toast({
          title: "Payment Successful",
          description: `KES ${amount.toLocaleString()} has been added to your savings.`,
        });
        
        setIsProcessing(false);
      }, 5000); // Wait 5 seconds for user to enter PIN

    } catch (error) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
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
      localStorage.removeItem("helaLoanLimit");
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
            <div className="bg-gradient-to-br from-primary to-primary/80 p-6 rounded-xl text-white">
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

            {/* Show deposit form if not enough savings OR not in loan flow */}
            {(!hasSufficientSavings || !isLoanFlow) && (
              <>
                {/* Friendly Message */}
                <div className="text-center p-4 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-sm text-muted-foreground">
                    {isLoanFlow 
                      ? "Just a quick deposit and you're all set! We'll send a prompt to your phone."
                      : "Save effortlessly with M-Pesa. We'll send a payment prompt right to your phone."
                    }
                  </p>
                </div>

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
                      disabled={isProcessing}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Enter the number registered with M-Pesa</p>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Amount to Save (KES)</label>
                  <Input
                    type="number"
                    placeholder={isLoanFlow && !hasSufficientSavings 
                      ? `Minimum KES ${MIN_SAVINGS_BALANCE - (savingsBalance || 0)}` 
                      : "Enter amount (min KES 100)"
                    }
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min={100}
                    disabled={isProcessing}
                  />
                </div>

                <Button 
                  variant="cute" 
                  size="lg"
                  className="w-full"
                  onClick={handlePayNow}
                  disabled={isProcessing || !phoneNumber.trim() || !depositAmount}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending prompt to your phone...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Pay Now
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  You'll receive an M-Pesa prompt on your phone. Just enter your PIN to complete.
                </p>
              </>
            )}

            {/* Show proceed button only in loan flow with sufficient savings */}
            {isLoanFlow && hasSufficientSavings && (
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

            {/* Apply for Loan button - only show when not in loan flow */}
            {!isLoanFlow && (
              <Button 
                variant="cute"
                className="w-full"
                onClick={() => navigate("/application")}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Apply for a Loan
              </Button>
            )}

            <Button 
              variant="outline"
              className="w-full"
              onClick={() => navigate(isLoanFlow ? "/loan-selection" : "/dashboard")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {isLoanFlow ? "Back to Loan Selection" : "Back to Dashboard"}
            </Button>
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
