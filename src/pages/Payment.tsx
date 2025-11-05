import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Smartphone, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Payment = () => {
  const [processingFee, setProcessingFee] = useState(0);
  const [loanAmount, setLoanAmount] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handlePayNow = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Number Required",
        description: "Please enter your M-Pesa phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate phone number format
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 12) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid M-Pesa phone number",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const applicationId = localStorage.getItem("currentApplicationId");
      
      if (!applicationId) {
        toast({
          title: "Error",
          description: "Application not found. Please start over.",
          variant: "destructive",
        });
        setIsProcessing(false);
        navigate("/application");
        return;
      }

      // Call STK Push edge function
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phoneNumber: phoneNumber,
          amount: processingFee,
          applicationId: applicationId,
        }
      });

      if (error) {
        console.error("STK Push error:", error);
        toast({
          title: "Payment Failed",
          description: error.message || "Failed to initiate payment. Please try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      if (!data?.success) {
        toast({
          title: "Payment Failed",
          description: data?.error || "Failed to initiate payment. Please try again.",
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      setPaymentInitiated(true);
      setIsProcessing(false);
      
      toast({
        title: "Payment Request Sent! 📱",
        description: "Please check your phone and enter your M-Pesa PIN to complete payment.",
      });

      // Listen for real-time payment status updates
      const checkoutRequestId = data.checkoutRequestId;
      
      const channel = supabase
        .channel('payment-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'loan_disbursements',
            filter: `transaction_code=eq.${checkoutRequestId}`,
          },
          (payload) => {
            console.log('Payment status update:', payload);
            
            if (payload.new.payment_verified) {
              // Payment successful
              channel.unsubscribe();
              
              // Clear localStorage
              localStorage.removeItem("currentApplicationId");
              localStorage.removeItem("helaLoanLimit");
              localStorage.removeItem("selectedLoanAmount");
              localStorage.removeItem("processingFee");

              toast({
                title: "Payment Successful! 🎉",
                description: "Your loan is being disbursed to your M-Pesa number now.",
              });
              
              setTimeout(() => {
                navigate("/dashboard");
              }, 2000);
            } else if (payload.new.payment_verified === false) {
              // Payment failed
              channel.unsubscribe();
              setPaymentInitiated(false);
              setIsProcessing(false);
              
              toast({
                title: "Payment Failed",
                description: "Your payment was not successful. Please try again.",
                variant: "destructive",
              });
            }
          }
        )
        .subscribe();

      // Set a timeout for payment confirmation (60 seconds)
      setTimeout(() => {
        channel.unsubscribe();
        if (paymentInitiated) {
          toast({
            title: "Payment Pending",
            description: "Payment is taking longer than expected. Please check your dashboard.",
            variant: "destructive",
          });
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
        }
      }, 60000);

    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
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
              Pay the processing fee to receive your loan
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
                  <span className="font-semibold">Processing Fee:</span>
                  <span className="font-bold text-primary">KES {processingFee.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* STK Push Instructions */}
            <div className="space-y-4">
              <div className="bg-primary/5 p-6 rounded-xl border-2 border-primary/20">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  M-Pesa STK Push Payment
                </h3>
                
                <ol className="space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span className="font-bold text-primary min-w-6">1.</span>
                    <span>Enter your M-Pesa phone number below</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary min-w-6">2.</span>
                    <span>Click "Pay Now" button</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary min-w-6">3.</span>
                    <span>You'll receive a prompt on your phone</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary min-w-6">4.</span>
                    <span>Enter your M-Pesa PIN to complete the payment</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary min-w-6">5.</span>
                    <span>Your loan will be disbursed automatically</span>
                  </li>
                </ol>
              </div>

              {/* Important Notice */}
              <div className="bg-accent/20 p-4 rounded-xl border-2 border-accent/30 flex gap-3">
                <AlertCircle className="w-5 h-5 text-accent-foreground flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-accent-foreground">Important Reminder</p>
                  <p className="text-xs text-muted-foreground">
                    Use the same M-Pesa number you registered with. 
                    Your loan will be disbursed to this number once payment is confirmed.
                  </p>
                </div>
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-4">
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-semibold mb-2">
                  M-Pesa Phone Number
                </label>
                <input
                  id="phoneNumber"
                  type="tel"
                  placeholder="e.g., 0712345678 or 254712345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-primary/20 focus:border-primary focus:outline-none transition-colors bg-card text-foreground placeholder:text-muted-foreground"
                  disabled={paymentInitiated}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {paymentInitiated 
                    ? "Payment request sent. Check your phone for the M-Pesa prompt."
                    : "Enter your M-Pesa registered phone number"
                  }
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                variant="cute" 
                size="lg"
                className="w-full"
                onClick={handlePayNow}
                disabled={isProcessing || paymentInitiated}
              >
                {isProcessing ? "Processing..." : paymentInitiated ? "Waiting for Payment..." : "Pay Now"}
              </Button>
              
              <Button 
                variant="outline"
                className="w-full"
                onClick={() => navigate("/loan-selection")}
                disabled={isProcessing || paymentInitiated}
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
