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
            <h3 className="font-bold text-lg">Hela Loans Terms of Service</h3>
            
            <div className="space-y-2">
              <h4 className="font-semibold">1. Loan Agreement</h4>
              <p className="text-sm text-muted-foreground">
                By applying for a loan through Hela Loans, you agree to repay the full loan amount plus any applicable fees within the agreed timeframe.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">2. Processing Fee</h4>
              <p className="text-sm text-muted-foreground">
                A loan activation fee is required before disbursement. This fee is non-refundable and varies based on the loan amount requested.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">3. Repayment Terms</h4>
              <p className="text-sm text-muted-foreground">
                Loans must be repaid according to the schedule provided. Late payments may incur additional fees and affect your credit rating.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">4. Data Privacy</h4>
              <p className="text-sm text-muted-foreground">
                We protect your personal information and use it only for loan processing and communication purposes.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">5. Eligibility</h4>
              <p className="text-sm text-muted-foreground">
                You must be 18 years or older, have a valid ID, and an M-Pesa registered phone number to qualify.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold">6. Contact Information</h4>
              <p className="text-sm text-muted-foreground">
                The next of kin and contact person information provided may be contacted in case of default.
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
