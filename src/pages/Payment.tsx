import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Smartphone, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Payment = () => {
  const [processingFee, setProcessingFee] = useState(0);
  const [loanAmount, setLoanAmount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [transactionCode, setTransactionCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const tillNumber = "22222";

  useEffect(() => {
    const fee = localStorage.getItem("processingFee");
    const amount = localStorage.getItem("selectedLoanAmount");
    
    if (!fee || !amount) {
      navigate("/loan-selection");
      return;
    }
    
    setProcessingFee(parseInt(fee));
    setLoanAmount(parseInt(amount));
  }, [navigate]);

  const copyTillNumber = () => {
    navigator.clipboard.writeText(tillNumber);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Till number copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerifyPayment = async () => {
    if (!transactionCode.trim()) {
      toast({
        title: "Transaction Code Required",
        description: "Please enter your M-Pesa transaction code",
        variant: "destructive",
      });
      return;
    }

    if (transactionCode.length < 8) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid M-Pesa transaction code",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    
    // Simulate payment verification (in real app, this would call a backend API)
    setTimeout(() => {
      setIsVerifying(false);
      toast({
        title: "Payment Verified! 🎉",
        description: "Your loan is being disbursed to your M-Pesa number now.",
      });
      
      setTimeout(() => {
        navigate("/");
      }, 3000);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="container max-w-2xl mx-auto space-y-6">
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Complete Payment</CardTitle>
            <CardDescription>
              Pay the activation fee to receive your loan
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Loan Summary */}
            <div className="bg-muted/50 p-6 rounded-xl space-y-3">
              <h3 className="font-semibold text-lg">Loan Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Loan Amount:</span>
                  <span className="font-bold">KES {loanAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Activation Fee:</span>
                  <span className="font-bold text-primary">KES {processingFee.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Instructions */}
            <div className="space-y-4">
              <div className="bg-primary/5 p-6 rounded-xl border-2 border-primary/20">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  M-Pesa Payment Instructions
                </h3>
                
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="font-bold text-primary min-w-6">1.</span>
                    <span>Go to M-Pesa menu on your phone</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary min-w-6">2.</span>
                    <span>Select "Lipa na M-Pesa"</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary min-w-6">3.</span>
                    <span>Select "Buy Goods and Services"</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary min-w-6">4.</span>
                    <span>Enter Till Number: <strong>{tillNumber}</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary min-w-6">5.</span>
                    <span>Enter Amount: <strong>KES {processingFee.toLocaleString()}</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary min-w-6">6.</span>
                    <span>Enter your M-Pesa PIN and confirm</span>
                  </li>
                </ol>
              </div>

              {/* Till Number Display */}
              <div className="bg-gradient-primary p-6 rounded-xl text-white">
                <p className="text-white/80 text-sm mb-2">M-Pesa Till Number</p>
                <div className="flex items-center justify-between">
                  <p className="text-4xl font-bold tracking-wider">{tillNumber}</p>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={copyTillNumber}
                    className="h-12 w-12"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <Copy className="w-6 h-6" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Important Notice */}
              <div className="bg-accent/20 p-4 rounded-xl border-2 border-accent/30 flex gap-3">
                <AlertCircle className="w-5 h-5 text-accent-foreground flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-accent-foreground">Important Reminder</p>
                  <p className="text-xs text-muted-foreground">
                    Make sure to pay using the same M-Pesa number you registered with. 
                    Your loan will be disbursed to this number once payment is confirmed.
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction Code Input */}
            <div className="space-y-4">
              <div>
                <label htmlFor="transactionCode" className="block text-sm font-semibold mb-2">
                  M-Pesa Transaction Code
                </label>
                <input
                  id="transactionCode"
                  type="text"
                  placeholder="e.g., QGH7K2M3P9"
                  value={transactionCode}
                  onChange={(e) => setTransactionCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 rounded-xl border-2 border-primary/20 focus:border-primary focus:outline-none transition-colors bg-card text-foreground placeholder:text-muted-foreground"
                  maxLength={15}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Enter the transaction code from your M-Pesa confirmation SMS
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                variant="cute" 
                size="lg"
                className="w-full"
                onClick={handleVerifyPayment}
                disabled={isVerifying}
              >
                {isVerifying ? "Verifying Payment..." : "Verify Payment & Get Loan"}
              </Button>
              
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => navigate("/loan-selection")}
                disabled={isVerifying}
              >
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="bg-card/50">
          <CardContent className="py-6">
            <p className="text-sm text-center text-muted-foreground">
              Need help? Contact us on WhatsApp: <strong className="text-foreground">0700 000 000</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
