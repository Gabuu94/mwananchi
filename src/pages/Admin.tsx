import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogOut, Users, FileText, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import helaLogo from "@/assets/hela-logo.png";

const Admin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    approvedLoans: 0,
    pendingSupport: 0,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user has admin role
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;

      if (!roles) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
      fetchData();
    } catch (error: any) {
      console.error("Error checking admin access:", error);
      toast.error("Failed to verify admin access");
      navigate("/dashboard");
    }
  };

  const fetchData = async () => {
    try {
      // Fetch all loan applications
      const { data: apps, error: appsError } = await supabase
        .from("loan_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (appsError) throw appsError;
      setApplications(apps || []);

      // Fetch all support requests
      const { data: support, error: supportError } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (supportError) throw supportError;
      setSupportRequests(support || []);

      // Calculate stats
      const pending = apps?.filter(app => app.status === "pending").length || 0;
      const approved = apps?.filter(app => app.status === "approved").length || 0;
      const pendingSupport = support?.filter(req => req.status === "pending").length || 0;

      setStats({
        totalApplications: apps?.length || 0,
        pendingApplications: pending,
        approvedLoans: approved,
        pendingSupport,
      });
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gradient-soft p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <img src={helaLogo} alt="Hela Loans" className="h-10 sm:h-12 w-auto" />
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage all loan applications and support</p>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Apps</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold">{stats.totalApplications}</p>
                </div>
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-yellow-600">{stats.pendingApplications}</p>
                </div>
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Approved</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-green-600">{stats.approvedLoans}</p>
                </div>
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Support</p>
                  <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-600">{stats.pendingSupport}</p>
                </div>
                <MessageSquare className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/admin/applications")}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Manage Applications</h3>
                  <p className="text-sm text-muted-foreground">Review and approve loan applications</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/support")}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Support Requests</h3>
                  <p className="text-sm text-muted-foreground">View and respond to customer support</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Applications */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Loan Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {applications.slice(0, 5).map((app) => (
                <div key={app.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 p-3 sm:p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{app.full_name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      KES {app.loan_limit.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {getStatusBadge(app.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;
