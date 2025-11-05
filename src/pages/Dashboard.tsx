import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, LogOut, CreditCard, Edit, Save, User, Phone, Hash, DollarSign, Clock, CheckCircle, XCircle, MessageSquare, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChatBot } from "@/components/ChatBot";
import helaLogo from "@/assets/hela-logo.png";

const Dashboard = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loanApplications, setLoanApplications] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    fullName: "",
    idNumber: "",
    phoneNumber: "",
  });

  useEffect(() => {
    checkUser();
    fetchData();
    fetchSupportRequests();

    // Realtime subscription for support requests
    const channel = supabase
      .channel('user-support-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_requests'
        },
        (payload) => {
          // Only update if it's for the current user
          const newData = payload.new as any;
          if (newData && user && newData.user_id === user.id) {
            fetchSupportRequests();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    setFormData({
      fullName: user.user_metadata.full_name || "",
      idNumber: user.user_metadata.id_number || "",
      phoneNumber: user.user_metadata.phone || "",
    });
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

  const fetchSupportRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("support_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSupportRequests(data || []);
    } catch (error: any) {
      console.error("Error fetching support requests:", error);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName,
          id_number: formData.idNumber,
          phone: formData.phoneNumber,
        }
      });

      if (error) throw error;

      toast.success("Profile updated successfully!");
      setIsEditing(false);
      checkUser();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSaving(false);
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

  return (
    <div className="min-h-screen bg-gradient-soft p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={helaLogo} alt="Hela Loans" className="h-12 w-auto" />
            <div>
              <h1 className="text-3xl font-bold">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {formData.fullName}!</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Profile Section */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>Manage your personal details</CardDescription>
            </div>
            {!isEditing ? (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            ) : (
              <Button onClick={handleSaveProfile} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="idNumber">ID Number</Label>
                <Input
                  id="idNumber"
                  value={formData.idNumber}
                  onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loans Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              My Loans
            </CardTitle>
            <CardDescription>View and manage your loan applications</CardDescription>
          </CardHeader>
          <CardContent>
            {loanApplications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">You don't have any loan applications yet</p>
                <Button onClick={() => navigate("/application")} variant="cute">
                  Apply for a Loan
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {loanApplications.map((loan) => {
                  const disbursement = disbursements.find(d => d.application_id === loan.id);
                  
                  return (
                    <Card key={loan.id} className="border-2">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Application Date</p>
                            <p className="font-semibold">{new Date(loan.created_at).toLocaleDateString()}</p>
                          </div>
                          {getStatusBadge(loan.status)}
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Loan Limit</p>
                              <p className="font-bold">KES {loan.loan_limit.toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">M-Pesa Number</p>
                              <p className="font-medium">{loan.whatsapp_number}</p>
                            </div>
                          </div>
                        </div>

                        {disbursement && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-muted-foreground">Loan Amount</p>
                                <p className="font-bold text-lg">KES {disbursement.loan_amount.toLocaleString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Processing Fee</p>
                                <p className="font-medium">KES {disbursement.processing_fee.toLocaleString()}</p>
                              </div>
                            </div>
                            {disbursement.payment_verified && !disbursement.disbursed && (
                              <Badge className="mt-2 bg-yellow-500">Payment Verified - Processing Disbursement</Badge>
                            )}
                            {disbursement.disbursed && (
                              <Badge className="mt-2 bg-green-500">Loan Disbursed</Badge>
                            )}
                            {!disbursement.payment_verified && (
                              <Button 
                                className="mt-4 w-full" 
                                variant="cute"
                                onClick={() => navigate("/payment", { state: { applicationId: loan.id } })}
                              >
                                Pay Processing Fee
                              </Button>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

          {/* Support Requests Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Support Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supportRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No support requests yet</p>
              ) : (
                <div className="space-y-4">
                  {supportRequests.map((request) => (
                    <Card key={request.id} className="border-2">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={request.status === "resolved" ? "default" : "secondary"}
                            className="flex items-center gap-1"
                          >
                            {request.status === "resolved" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {request.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">Your Message:</p>
                          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                            {request.message}
                          </p>
                        </div>

                        {request.admin_reply && (
                          <div className="bg-primary/5 p-3 rounded-lg border-l-4 border-primary">
                            <p className="text-sm font-medium mb-1 text-primary">Admin Reply:</p>
                            <p className="text-sm">{request.admin_reply}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Support Requests Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Support Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {supportRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No support requests yet</p>
              ) : (
                <div className="space-y-4">
                  {supportRequests.map((request) => (
                    <Card key={request.id} className="border-2">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant={request.status === "resolved" ? "default" : "secondary"}
                            className="flex items-center gap-1"
                          >
                            {request.status === "resolved" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {request.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">Your Message:</p>
                          <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                            {request.message}
                          </p>
                        </div>

                        {request.admin_reply && (
                          <div className="bg-primary/5 p-3 rounded-lg border-l-4 border-primary">
                            <p className="text-sm font-medium mb-1 text-primary">Admin Reply:</p>
                            <p className="text-sm">{request.admin_reply}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <Button onClick={() => navigate("/application")} variant="cute">
              New Loan Application
            </Button>
            <Button onClick={() => navigate("/terms")} variant="outline">
              View Terms & Conditions
            </Button>
          </CardContent>
        </Card>
      </div>

      <ChatBot />
    </div>
  );
};

export default Dashboard;
