import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { Banknote, CreditCard, PiggyBank, FileText, ArrowRight, Info, Eye, EyeOff, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import helaPesaLogo from "@/assets/hela-pesa-logo.png";

const LoanSelection = () => {
  const [loanLimit, setLoanLimit] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [showBalance, setShowBalance] = useState(true);
  const [savingsBalance, setSavingsBalance] = useState(0);
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
    setSelectedAmount(Math.floor(limitAmount / 2));
    
    fetchSavingsBalance();
  }, [navigate]);

  const fetchSavingsBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_savings")
      .select("balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setSavingsBalance(data.balance);
    }
  };

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
    navigate("/payment");
  };

  const quickActions = [
    { icon: PiggyBank, label: "Savings", active: false, onClick: () => navigate("/payment") },
    { icon: CreditCard, label: "Pay", active: false, onClick: () => navigate("/dashboard", { state: { openRepay: true } }) },
    { icon: FileText, label: "History", active: false, onClick: () => navigate("/dashboard", { state: { scrollToHistory: true } }) },
  ];

  const hasSufficientSavings = savingsBalance >= 500;

  return (
    <div className="min-h-screen bg-background">
      {/* Gradient Header Section */}
      <div className="bg-gradient-to-br from-primary via-primary to-primary/80 rounded-b-[2.5rem] pb-8 pt-6 px-4">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center overflow-hidden">
              <img src={helaPesaLogo} alt="Hela Pesa" className="w-full h-full object-cover" />
            </div>
            <div className="text-white">
              <p className="text-sm opacity-80">Welcome,</p>
              <p className="font-bold">User</p>
            </div>
          </div>
        </div>

        {/* Balance Display */}
        <div className="text-center text-white mb-6">
          <p className="text-sm opacity-80 mb-2">Your Loan Limit (KES)</p>
          <div className="flex items-center justify-center gap-3">
            <p className="text-3xl font-bold tracking-wide">
              {showBalance ? `KES ${loanLimit.toLocaleString()}` : "****"}
            </p>
            <button 
              onClick={() => setShowBalance(!showBalance)}
              className="p-1 hover:bg-white/10 rounded-full transition-colors"
            >
              {showBalance ? (
                <EyeOff className="w-5 h-5 text-white/80" />
              ) : (
                <Eye className="w-5 h-5 text-white/80" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm opacity-80">
            <Wallet className="w-4 h-4" />
            <span>Savings: KES {savingsBalance.toLocaleString()}</span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex justify-center gap-6">
          {quickActions.map((action, index) => (
            <button 
              key={index} 
              className="flex flex-col items-center gap-2"
              onClick={action.onClick}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                action.active 
                  ? "bg-white shadow-lg" 
                  : "bg-white/20 hover:bg-white/30"
              }`}>
                <action.icon className={`w-6 h-6 ${action.active ? "text-primary" : "text-white"}`} />
              </div>
              <span className={`text-xs font-medium ${action.active ? "text-white" : "text-white/70"}`}>
                {action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 -mt-4">
        {/* Loan Amount Selection Card */}
        <Card className="shadow-card border-0 mb-4">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">Select Loan Amount</h3>
            
            {/* Amount Input */}
            <div className="bg-muted/50 rounded-2xl p-4 mb-6">
              <p className="text-xs text-muted-foreground mb-2 text-center">Enter Amount (KES)</p>
              <Input
                type="number"
                value={selectedAmount}
                onChange={handleInputChange}
                max={loanLimit}
                min={0}
                className="text-3xl font-bold h-16 text-center border-0 bg-transparent focus-visible:ring-0"
              />
            </div>

            {/* Slider */}
            <div className="space-y-3 mb-6">
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

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[0.25, 0.5, 0.75, 1].map((percent) => (
                <Button
                  key={percent}
                  variant={selectedAmount === Math.floor(loanLimit * percent) ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setSelectedAmount(Math.floor(loanLimit * percent))}
                >
                  {percent === 1 ? "Max" : `${percent * 100}%`}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Loan Summary Card */}
        <Card className="shadow-card border-0 mb-4">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">Loan Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border/50">
                <span className="text-muted-foreground">Loan Amount</span>
                <span className="font-semibold">KES {selectedAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="font-semibold">You'll Receive</span>
                <span className="font-bold text-xl text-primary">KES {selectedAmount.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Savings Requirement Info */}
        <div className={`flex items-start gap-3 p-4 rounded-xl mb-6 ${
          hasSufficientSavings 
            ? "bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800" 
            : "bg-accent/20"
        }`}>
          <Wallet className={`w-5 h-5 mt-0.5 flex-shrink-0 ${hasSufficientSavings ? "text-green-600" : "text-primary"}`} />
          <div>
            {hasSufficientSavings ? (
              <p className="text-sm text-green-700 dark:text-green-400">
                Your savings balance qualifies you for loan disbursement.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                You need at least <strong>KES 500</strong> in savings to proceed with disbursement. 
                Current balance: <strong>KES {savingsBalance.toLocaleString()}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Proceed Button */}
        <Button 
          variant="cute" 
          size="lg"
          className="w-full mb-8"
          onClick={handleProceed}
          disabled={selectedAmount < 1000}
        >
          <span>{hasSufficientSavings ? "Proceed to Disbursement" : "Proceed to Fund Savings"}</span>
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default LoanSelection;
