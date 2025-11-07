import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CreditCard, User, DollarSign, Clock, CheckCircle, XCircle, FileText, PiggyBank, TrendingUp, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChatBot } from "@/components/ChatBot";
import { UserMenu } from "@/components/UserMenu";
import { ComingSoonDialog } from "@/components/ComingSoonDialog";
import helaLogo from "@/assets/hela-logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loanApplications, setLoanApplications] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [showComingSoon, setShowComingSoon] = useState(false);

  useEffect(() => {
    checkUser();
    fetchData();
  }, []);

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
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
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
            <img src={helaLogo} alt="Hela Loans" className="h-10 sm:h-12 w-auto flex-shrink-0 drop-shadow-lg" />
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

        {/* Savings Section - HELA MMF */}
        <Card className="border-2 border-accent/30 shadow-card overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-10 rounded-full blur-3xl" />
          <CardHeader className="relative">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-accent/20">
                <PiggyBank className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">Start Saving with HELA MMF</CardTitle>
                <CardDescription className="text-base">
                  Grow your money with Kenya's trusted Money Market Fund
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">High Returns</h4>
                </div>
                <p className="text-2xl font-bold text-primary">17.24%*</p>
                <p className="text-xs text-muted-foreground mt-1">Effective Annual Yield</p>
              </div>
              
              <div className="p-4 rounded-2xl bg-secondary/5 border border-secondary/20">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-secondary-foreground" />
                  <h4 className="font-semibold">Low Entry</h4>
                </div>
                <p className="text-2xl font-bold text-secondary-foreground">KES 100</p>
                <p className="text-xs text-muted-foreground mt-1">Minimum Investment</p>
              </div>
              
              <div className="p-4 rounded-2xl bg-accent/5 border border-accent/20">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-5 h-5 text-accent-foreground" />
                  <h4 className="font-semibold">Flexible</h4>
                </div>
                <p className="text-2xl font-bold text-accent-foreground">No Lock-in</p>
                <p className="text-xs text-muted-foreground mt-1">Withdraw Anytime</p>
              </div>
            </div>

            <div className="space-y-3 p-4 rounded-2xl bg-muted/30">
              <h4 className="font-semibold text-sm">Key Benefits:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Daily compounding interest for maximum growth</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Regulated by Capital Markets Authority (CMA)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Management fee of only 2.0% p.a</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Start with as little as KES 100 and top up anytime</span>
                </li>
              </ul>
            </div>

            <Button 
              onClick={() => setShowComingSoon(true)}
              className="w-full bg-gradient-primary hover:opacity-90 transition-opacity text-lg py-6 rounded-2xl shadow-soft"
            >
              <PiggyBank className="w-5 h-5 mr-2" />
              Save Now
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              *Returns are subject to market conditions. Past performance is not indicative of future results.
            </p>
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
        <Card className="border-2 border-accent/10">
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
      </div>

      <ComingSoonDialog open={showComingSoon} onOpenChange={setShowComingSoon} />
      <ChatBot />
    </div>
  );
};

export default Dashboard;
