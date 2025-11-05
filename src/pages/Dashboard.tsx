import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogOut, CreditCard, User, DollarSign, Clock, CheckCircle, XCircle, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChatBot } from "@/components/ChatBot";
import { ThemeToggle } from "@/components/ThemeToggle";
import helaLogo from "@/assets/hela-logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loanApplications, setLoanApplications] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);

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


  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src={helaLogo} alt="Hela Loans" className="h-10 sm:h-12 w-auto" />
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">My Account</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none">Welcome back, {user?.user_metadata?.full_name || user?.email}!</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <ThemeToggle />
            <Button variant="outline" onClick={handleLogout} size="sm">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/application")}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Apply for New Loan</h3>
                  <p className="text-sm text-muted-foreground">Start a new loan application</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/profile")}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">View Profile</h3>
                  <p className="text-sm text-muted-foreground">Manage your account details</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Existing Loans */}
        {activeDisbursements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Existing Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeDisbursements.map((loan) => (
                  <Card key={loan.id} className="border-2">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div>
                          <p className="text-base sm:text-lg font-bold">KES {loan.loan_amount.toLocaleString()}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">Disbursed on {new Date(loan.created_at).toLocaleDateString()}</p>
                        </div>
                        <Badge className="bg-green-500 self-start sm:self-auto">Active</Badge>
                      </div>
                      <Button className="w-full mt-2" onClick={() => navigate("/payment")} size="sm">
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Loan Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingApplications.map((app) => (
                  <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 border rounded-lg">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Loan History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loanApplications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No loan applications yet</p>
                <Button onClick={() => navigate("/application")}>Apply for Your First Loan</Button>
              </div>
            ) : (
              <div className="space-y-3">
                {loanApplications.map((app) => (
                  <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 border rounded-lg">
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

      <ChatBot />
    </div>
  );
};

export default Dashboard;
