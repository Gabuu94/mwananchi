import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { Banknote, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const LoanSelection = () => {
  const [loanLimit, setLoanLimit] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [processingFee, setProcessingFee] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const limit = localStorage.getItem("helaLoanLimit");
    if (!limit) {
      navigate("/application");
      return;
    }
    
    const limitAmount = parseInt(limit);
    setLoanLimit(limitAmount);
    setSelectedAmount(Math.floor(limitAmount / 2)); // Default to half the limit
  }, [navigate]);

  useEffect(() => {
    // Calculate processing fee based on loan amount (between 399 and 1399)
    if (selectedAmount > 0) {
      const minFee = 399;
      const maxFee = 1399;
      const percentage = selectedAmount / loanLimit;
      const calculatedFee = Math.floor(minFee + (percentage * (maxFee - minFee)));
      setProcessingFee(calculatedFee);
    }
  }, [selectedAmount, loanLimit]);

  const handleSliderChange = (value: number[]) => {
    setSelectedAmount(value[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    if (value <= loanLimit) {
      setSelectedAmount(value);
    }
  };

  const handleProceed = () => {
    if (selectedAmount < 1000) {
      toast({
        title: "Amount Too Low",
        description: "Minimum loan amount is KES 1,000",
        variant: "destructive",
      });
      return;
    }

    localStorage.setItem("selectedLoanAmount", selectedAmount.toString());
    localStorage.setItem("processingFee", processingFee.toString());
    navigate("/payment");
  };

  return (
    <div className="min-h-screen bg-gradient-soft py-8 px-4">
      <div className="container max-w-2xl mx-auto">
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Banknote className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Select Loan Amount</CardTitle>
            <CardDescription>
              Choose how much you'd like to borrow
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-8">
            {/* Loan Limit Display */}
            <div className="bg-muted/50 p-4 rounded-xl text-center">
              <p className="text-sm text-muted-foreground mb-1">Your Approved Limit</p>
              <p className="text-2xl font-bold text-primary">
                KES {loanLimit.toLocaleString()}
              </p>
            </div>

            {/* Amount Selection */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Loan Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={selectedAmount}
                  onChange={handleInputChange}
                  max={loanLimit}
                  min={0}
                  className="text-2xl font-bold h-16 text-center"
                />
              </div>

              <div className="space-y-4">
                <Slider
                  value={[selectedAmount]}
                  onValueChange={handleSliderChange}
                  max={loanLimit}
                  min={0}
                  step={100}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>KES 0</span>
                  <span>KES {loanLimit.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Processing Fee */}
            <div className="bg-accent/20 p-6 rounded-xl space-y-4 border-2 border-accent/30">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-accent-foreground mt-0.5 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <h3 className="font-semibold text-accent-foreground">Loan Activation Fee</h3>
                  <p className="text-sm text-muted-foreground">
                    A one-time processing fee is required to activate your loan. This fee covers verification and disbursement costs.
                  </p>
                </div>
              </div>
              
              <div className="bg-card p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Processing Fee:</span>
                  <span className="text-xl font-bold text-primary">
                    KES {processingFee.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-gradient-primary p-6 rounded-xl text-white space-y-3">
              <h3 className="font-semibold text-lg">Loan Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/80">Loan Amount:</span>
                  <span className="font-bold">KES {selectedAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/80">Activation Fee:</span>
                  <span className="font-bold">KES {processingFee.toLocaleString()}</span>
                </div>
                <div className="border-t border-white/20 pt-2 mt-2">
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total to Receive:</span>
                    <span className="font-bold">KES {(selectedAmount).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <Button 
              variant="cute" 
              size="lg"
              className="w-full"
              onClick={handleProceed}
              disabled={selectedAmount < 1000}
            >
              Proceed to Payment
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoanSelection;
