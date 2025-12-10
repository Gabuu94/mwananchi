import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, User, DollarSign, Clock, CheckCircle, XCircle, FileText, PiggyBank, Wallet, ArrowUpRight, ArrowDownRight, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChatBot } from "@/components/ChatBot";
import { UserMenu } from "@/components/UserMenu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import mwananchiLogo from "@/assets/mwananchi-credit-logo.png";

interface SavingsDeposit {
  id: string;
  amount: number;
  transaction_code: string | null;
  verified: boolean;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  phone_number: string;
  status: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const historyRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loanApplications, setLoanApplications] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [savingsDeposits, setSavingsDeposits] = useState<SavingsDeposit[]>([]);
  const [showBalance, setShowBalance] = useState(true);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [showRepayDialog, setShowRepayDialog] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [repayAmount, setRepayAmount] = useState("");

  useEffect(() => {
    checkUser();
    fetchData();

    // Set up real-time subscriptions for automatic updates
    const channels: any[] = [];

    // Subscribe to user_savings changes
    const savingsChannel = supabase
      .channel('dashboard-savings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_savings' }, () => {
        fetchData();
      })
      .subscribe();
    channels.push(savingsChannel);

    // Subscribe to savings_deposits changes
    const depositsChannel = supabase
      .channel('dashboard-deposits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings_deposits' }, () => {
        fetchData();
      })
      .subscribe();
    channels.push(depositsChannel);

    // Subscribe to withdrawals changes
    const withdrawalsChannel = supabase
      .channel('dashboard-withdrawals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => {
        fetchData();
      })
      .subscribe();
    channels.push(withdrawalsChannel);

    // Subscribe to loan_applications changes
    const appsChannel = supabase
      .channel('dashboard-applications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_applications' }, () => {
        fetchData();
      })
      .subscribe();
    channels.push(appsChannel);

    // Subscribe to loan_disbursements changes
    const disbChannel = supabase
      .channel('dashboard-disbursements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loan_disbursements' }, () => {
        fetchData();
      })
      .subscribe();
    channels.push(disbChannel);

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  useEffect(() => {
    // Handle navigation state
    const state = location.state as { openRepay?: boolean; scrollToHistory?: boolean } | null;
    if (state?.openRepay) {
      setShowRepayDialog(true);
      // Clear the state
      navigate(location.pathname, { replace: true });
    }
    if (state?.scrollToHistory && historyRef.current) {
      setTimeout(() => {
        historyRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      navigate(location.pathname, { replace: true });
    }
  }, [location.state]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch loan applications
      const { data: applications, error: appError } = await supabase
        .from("loan_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (appError) throw appError;
      setLoanApplications(applications || []);

      // Fetch disbursements
      if (applications && applications.length > 0) {
        const { data: disb, error: disbError } = await supabase
          .from("loan_disbursements")
          .select("*, loan_applications!inner(*)")
          .eq("loan_applications.user_id", user.id)
          .order("created_at", { ascending: false });

        if (disbError) throw disbError;
        setDisbursements(disb || []);
      }

      // Fetch savings balance
      const { data: savings, error: savingsError } = await supabase
        .from("user_savings")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!savingsError && savings) {
        setSavingsBalance(savings.balance);
      }

      // Fetch savings deposits history
      const { data: deposits, error: depositsError } = await supabase
        .from("savings_deposits")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!depositsError && deposits) {
        setSavingsDeposits(deposits);
      }

      // Fetch withdrawals
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!withdrawalError && withdrawalData) {
        setWithdrawals(withdrawalData as Withdrawal[]);
      }

      // Auto-fill phone number from latest loan application
      if (applications && applications.length > 0) {
        setWithdrawPhone(applications[0].whatsapp_number || "");
      }

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    
    if (!amount || amount < 500) {
      toast.error("Minimum withdrawal amount is KES 500");
      return;
    }
    
    if (amount > savingsBalance) {
      toast.error("Insufficient balance. Your available balance is KES " + savingsBalance.toLocaleString());
      return;
    }
    
    if (!withdrawPhone || withdrawPhone.length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setIsWithdrawing(true);
    try {
      const { error } = await supabase
        .from("withdrawals")
        .insert({
          user_id: user.id,
          amount: amount,
          phone_number: withdrawPhone,
          status: "pending"
        });

      if (error) throw error;

      toast.success("Withdrawal request submitted successfully! It will be processed shortly.");
      setShowWithdrawDialog(false);
      setWithdrawAmount("");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsWithdrawing(false);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-gradient-primary border-0"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="rounded-xl"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="rounded-xl"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const pendingApplications = loanApplications.filter(app => app.status === "pending");
  const approvedLoans = loanApplications.filter(app => app.status === "approved");
  const activeDisbursements = disbursements.filter(d => d.disbursed);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-soft p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 animate-float">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <img src={mwananchiLogo} alt="Mwananchi Credit" className="h-10 sm:h-12 w-auto flex-shrink-0 drop-shadow-lg rounded-xl" />
            <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              My Account
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Welcome back, {user?.user_metadata?.full_name || user?.email}
            </p>
            </div>
          </div>
          <UserMenu 
            userName={user?.user_metadata?.full_name} 
            userEmail={user?.email}
          />
        </div>

        {/* Savings Balance Card */}
        <Card className="bg-gradient-to-br from-primary via-primary to-primary/80 text-white border-0 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <CardContent className="p-6 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm opacity-80">Your Savings Balance</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl sm:text-3xl font-bold">
                      {showBalance ? `KES ${savingsBalance.toLocaleString()}` : "KES ****"}
                    </p>
                    <button 
                      onClick={() => setShowBalance(!showBalance)}
                      className="p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                      {showBalance ? (
                        <EyeOff className="w-5 h-5 opacity-80" />
                      ) : (
                        <Eye className="w-5 h-5 opacity-80" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm opacity-80">
                {savingsBalance >= 500 ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Eligible for loan disbursement</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" />
                    <span>KES {(500 - savingsBalance).toLocaleString()} more to unlock loans</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => {
                    // Clear loan-related localStorage for pure savings flow
                    localStorage.removeItem("selectedLoanAmount");
                    localStorage.removeItem("currentApplicationId");
                    localStorage.removeItem("helaLoanLimit");
                    navigate("/payment");
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm"
                  onClick={() => setShowWithdrawDialog(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border-0"
                >
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                  Withdraw
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-soft hover:scale-105 transition-all duration-300 border-2 border-primary/20" onClick={() => navigate("/application")}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-primary animate-pulse-soft">
                  <DollarSign className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Apply for New Loan</h3>
                  <p className="text-sm text-muted-foreground">Start a new loan application</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-soft hover:scale-105 transition-all duration-300 border-2 border-secondary/20" onClick={() => navigate("/profile")}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-secondary/20">
                  <User className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">View Profile</h3>
                  <p className="text-sm text-muted-foreground">Manage your account details</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Savings History */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="w-5 h-5 text-primary" />
                Savings History
              </CardTitle>
              <Badge variant="outline" className="text-primary border-primary/30">
                {savingsDeposits.length} transactions
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {savingsDeposits.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-primary" />
                </div>
                <p className="text-muted-foreground mb-2">No savings deposits yet</p>
                <p className="text-sm text-muted-foreground mb-4">Start saving to unlock loan disbursement</p>
                <Button 
                  onClick={() => {
                    // Clear loan-related localStorage for pure savings flow
                    localStorage.removeItem("selectedLoanAmount");
                    localStorage.removeItem("currentApplicationId");
                    localStorage.removeItem("helaLoanLimit");
                    navigate("/payment");
                  }}
                  variant="outline"
                  className="rounded-xl"
                >
                  Save Now
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {savingsDeposits.map((deposit) => (
                  <div 
                    key={deposit.id} 
                    className="flex items-center justify-between p-4 border-2 border-muted rounded-2xl hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${deposit.verified ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                        <ArrowUpRight className={`w-5 h-5 ${deposit.verified ? 'text-green-600' : 'text-yellow-600'}`} />
                      </div>
                      <div>
                        <p className="font-semibold">KES {deposit.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {deposit.transaction_code || 'Processing'} • {new Date(deposit.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={deposit.verified ? "default" : "secondary"}
                      className={deposit.verified ? "bg-green-600" : ""}
                    >
                      {deposit.verified ? "Verified" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>


        {/* Existing Loans */}
        {activeDisbursements.length > 0 && (
          <Card className="border-2 border-primary/10">
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Existing Loans
            </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeDisbursements.map((loan) => (
                  <Card key={loan.id} className="border-2 border-primary/20 hover:shadow-soft transition-shadow">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div>
                          <p className="text-base sm:text-lg font-bold text-primary">KES {loan.loan_amount.toLocaleString()}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Disbursed on {new Date(loan.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge className="bg-gradient-primary border-0 self-start sm:self-auto">Active</Badge>
                      </div>
                      <Button 
                        className="w-full mt-2 rounded-xl" 
                        onClick={() => navigate("/payment")} 
                        size="sm"
                        variant="outline"
                      >
                        Repay Loan
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Applications */}
        {pendingApplications.length > 0 && (
          <Card className="border-2 border-secondary/10">
            <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-secondary-foreground" />
              Pending Loan Applications
            </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingApplications.map((app) => (
                  <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 border-2 border-muted rounded-2xl hover:border-secondary/30 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm sm:text-base font-medium">KES {app.loan_limit.toLocaleString()}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="self-start sm:self-auto">
                      {getStatusBadge(app.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loan History */}
        <Card className="border-2 border-accent/10" ref={historyRef}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent-foreground" />
              Loan History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loanApplications.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-primary/10 flex items-center justify-center">
                  <FileText className="w-10 h-10 text-primary" />
                </div>
                <p className="text-muted-foreground mb-4">No loan applications yet</p>
                <Button 
                  onClick={() => navigate("/application")}
                  className="bg-gradient-primary rounded-xl"
                >
                  Apply for Your First Loan
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {loanApplications.map((app) => (
                  <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 border-2 border-muted rounded-2xl hover:border-accent/30 transition-colors">
                    <div className="flex-1">
                      <p className="text-sm sm:text-base font-medium">KES {app.loan_limit.toLocaleString()}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="self-start sm:self-auto">
                      {getStatusBadge(app.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Withdrawal History */}
        <Card className="border-2 border-orange-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-orange-500" />
                Withdrawal History
              </CardTitle>
              <Badge variant="outline" className="text-orange-500 border-orange-500/30">
                {withdrawals.length} requests
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <ArrowDownRight className="w-8 h-8 text-orange-500" />
                </div>
                <p className="text-muted-foreground mb-2">No withdrawal requests yet</p>
                <p className="text-sm text-muted-foreground">Request a withdrawal when you have savings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((withdrawal) => (
                  <div 
                    key={withdrawal.id} 
                    className="flex items-center justify-between p-4 border-2 border-muted rounded-2xl hover:border-orange-500/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        withdrawal.status === 'completed' 
                          ? 'bg-green-100 dark:bg-green-900/30' 
                          : withdrawal.status === 'rejected'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-orange-100 dark:bg-orange-900/30'
                      }`}>
                        <ArrowDownRight className={`w-5 h-5 ${
                          withdrawal.status === 'completed' 
                            ? 'text-green-600' 
                            : withdrawal.status === 'rejected'
                            ? 'text-red-600'
                            : 'text-orange-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-semibold">KES {withdrawal.amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {withdrawal.phone_number} • {new Date(withdrawal.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant={withdrawal.status === 'completed' ? "default" : withdrawal.status === 'rejected' ? "destructive" : "secondary"}
                      className={withdrawal.status === 'completed' ? "bg-green-600" : ""}
                    >
                      {withdrawal.status === 'completed' ? "Completed" : withdrawal.status === 'rejected' ? "Rejected" : "Pending"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Repay Loan Dialog */}
      <Dialog open={showRepayDialog} onOpenChange={setShowRepayDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Repay Loan</DialogTitle>
            <DialogDescription>
              Select a loan and enter the amount you want to repay.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {activeDisbursements.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">You have no active loans to repay.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Loan</Label>
                  <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a loan to repay" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeDisbursements.map((loan) => (
                        <SelectItem key={loan.id} value={loan.id}>
                          KES {loan.loan_amount.toLocaleString()} - {new Date(loan.created_at).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repayAmount">Repayment Amount (KES)</Label>
                  <Input
                    id="repayAmount"
                    type="number"
                    placeholder="Enter amount to repay"
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(e.target.value)}
                    min={1}
                  />
                </div>
                <Button 
                  onClick={() => {
                    if (!selectedLoanId) {
                      toast.error("Please select a loan to repay");
                      return;
                    }
                    if (!repayAmount || parseInt(repayAmount) < 1) {
                      toast.error("Please enter a valid repayment amount");
                      return;
                    }
                    localStorage.setItem("repayLoanId", selectedLoanId);
                    localStorage.setItem("repayAmount", repayAmount);
                    setShowRepayDialog(false);
                    navigate("/payment", { state: { isRepayment: true } });
                  }} 
                  className="w-full bg-gradient-primary"
                  disabled={!selectedLoanId || !repayAmount}
                >
                  Proceed to Payment
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdrawal Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Withdraw Savings</DialogTitle>
            <DialogDescription>
              Enter the amount you want to withdraw. Minimum KES 500.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center p-4 bg-muted rounded-xl">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-primary">KES {savingsBalance.toLocaleString()}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Withdrawal Amount (KES)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount (min 500)"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                min={500}
                max={savingsBalance}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">M-Pesa Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. 0712345678"
                value={withdrawPhone}
                onChange={(e) => setWithdrawPhone(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleWithdraw} 
              className="w-full bg-gradient-primary"
              disabled={isWithdrawing}
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Submit Withdrawal Request"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ChatBot />
    </div>
  );
};

export default Dashboard;
