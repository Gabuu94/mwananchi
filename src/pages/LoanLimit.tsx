import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { PartyPopper, ArrowRight } from "lucide-react";

const LoanLimit = () => {
  const [loanLimit, setLoanLimit] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const limit = localStorage.getItem("helaLoanLimit");
    if (!limit) {
      navigate("/application");
      return;
    }
    
    setLoanLimit(parseInt(limit));
    setShowConfetti(true);

    // Hide confetti animation after 3 seconds
    setTimeout(() => setShowConfetti(false), 3000);
  }, [navigate]);

  const handleContinue = () => {
    navigate("/loan-selection");
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card relative overflow-hidden">
        {showConfetti && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="animate-bounce-soft">
              <PartyPopper className="w-32 h-32 text-primary opacity-20" />
            </div>
          </div>
        )}
        
        <CardHeader className="text-center space-y-4 relative z-10">
          <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto animate-pulse-soft shadow-soft">
            <PartyPopper className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl">Congratulations!</CardTitle>
          <CardDescription className="text-base">
            Your loan application has been approved
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center space-y-6 relative z-10">
          <div className="bg-gradient-primary p-8 rounded-2xl shadow-soft">
            <p className="text-white/80 text-sm font-medium mb-2">Your Loan Limit</p>
            <p className="text-5xl font-bold text-white">
              KES {loanLimit.toLocaleString()}
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-xl">
            <p className="text-sm text-muted-foreground">
              You can now borrow any amount up to your approved limit. Choose the amount you need in the next step.
            </p>
          </div>

          <Button 
            variant="cute" 
            size="lg"
            className="w-full"
            onClick={handleContinue}
          >
            Choose Loan Amount
            <ArrowRight className="w-5 h-5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoanLimit;
