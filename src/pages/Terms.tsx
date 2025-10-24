import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigate } from "react-router-dom";
import { FileCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Terms = () => {
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleContinue = () => {
    if (!accepted) {
      toast({
        title: "Please Accept Terms",
        description: "You must accept the terms and conditions to continue",
        variant: "destructive",
      });
      return;
    }
    navigate("/application");
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-card">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Terms & Conditions</CardTitle>
          <CardDescription>
            Please read and accept our terms to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted p-6 rounded-xl max-h-96 overflow-y-auto space-y-4">
            <h3 className="font-bold text-lg">Hela Loans Terms & Conditions</h3>
            
            <div className="space-y-2">
              <h4 className="font-semibold">1. Acceptance of Terms</h4>
              <p className="text-sm text-muted-foreground">
                By using Hela Loans services, you agree to these terms. You must be 18+ years old with a valid ID and M-Pesa registered phone number.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">2. Loan Agreement</h4>
              <p className="text-sm text-muted-foreground">
                Your loan amount and repayment terms will be clearly displayed before acceptance. You agree to repay the full amount plus any applicable interest and fees within the agreed timeframe. Late payments incur 1.5% daily interest on the outstanding principal.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">3. Processing & Disbursement</h4>
              <p className="text-sm text-muted-foreground">
                A processing fee is required before loan disbursement. This fee is non-refundable. We reserve the right to approve or decline loan applications at our discretion. Approved loans are disbursed to your M-Pesa account.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">4. Data Privacy & Consent</h4>
              <p className="text-sm text-muted-foreground">
                We collect and process your personal information for loan assessment and disbursement. You consent to us accessing your M-Pesa transaction data and sharing information with Credit Reference Bureaus. We may report default information to credit bureaus.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">5. Default & Consequences</h4>
              <p className="text-sm text-muted-foreground">
                Failure to repay on time may result in: late payment charges, negative credit bureau reporting, and contact with your next of kin or provided references. We may take legal action to recover outstanding amounts.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">6. Limitation of Liability</h4>
              <p className="text-sm text-muted-foreground">
                Hela Loans is not liable for service interruptions due to technical issues, network failures, or circumstances beyond our control. We reserve the right to modify these terms with notice.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">7. Governing Law</h4>
              <p className="text-sm text-muted-foreground">
                These terms are governed by the laws of Kenya. Any disputes shall be resolved in Kenyan courts.
              </p>
            </div>

            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Contact Us:</strong> For support, email support@helaloans.com or call +254 755 440 358
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 bg-card rounded-xl border-2 border-border">
            <Checkbox 
              id="terms" 
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
            />
            <label
              htmlFor="terms"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              I have read and accept the terms and conditions
            </label>
          </div>

          <div className="flex gap-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate("/auth")}
            >
              Go Back
            </Button>
            <Button 
              variant="cute" 
              className="flex-1"
              onClick={handleContinue}
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Terms;
