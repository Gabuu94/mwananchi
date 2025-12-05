import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Users, FileText, MessageSquare, CheckCircle, XCircle, Clock, 
  Wallet, PiggyBank, ArrowDownToLine, BadgeCheck, Eye, EyeOff
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "@/components/UserMenu";
import { Textarea } from "@/components/ui/textarea";
import helaLogo from "@/assets/hela-logo.png";

const Admin = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [supportRequests, setSupportRequests] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [disbursements, setDisbursements] = useState<any[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [activeTyping, setActiveTyping] = useState<string | null>(null);
  const [expandedApp, setExpandedApp] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingApplications: 0,
    approvedLoans: 0,
    pendingSupport: 0,
    pendingWithdrawals: 0,
    unverifiedDeposits: 0,
    pendingDisbursements: 0,
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

      setUser(user);

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
      fetchAllData();
    } catch (error: any) {
      console.error("Error checking admin access:", error);
      toast.error("Failed to verify admin access");
      navigate("/dashboard");
    }
  };

  const fetchAllData = async () => {
    try {
      // Fetch all data in parallel
      const [appsRes, supportRes, withdrawalsRes, depositsRes, disbursementsRes] = await Promise.all([
        supabase.from("loan_applications").select("*").order("created_at", { ascending: false }),
        supabase.from("support_requests").select("*").order("created_at", { ascending: false }),
        supabase.from("withdrawals").select("*").order("created_at", { ascending: false }),
        supabase.from("savings_deposits").select("*").order("created_at", { ascending: false }),
        supabase.from("loan_disbursements").select("*, loan_applications(full_name, whatsapp_number)").order("created_at", { ascending: false }),
      ]);

      if (appsRes.error) throw appsRes.error;
      if (supportRes.error) throw supportRes.error;
      if (withdrawalsRes.error) throw withdrawalsRes.error;
      if (depositsRes.error) throw depositsRes.error;
      if (disbursementsRes.error) throw disbursementsRes.error;

      setApplications(appsRes.data || []);
      setSupportRequests(supportRes.data || []);
      setWithdrawals(withdrawalsRes.data || []);
      setDeposits(depositsRes.data || []);
      setDisbursements(disbursementsRes.data || []);

      // Calculate stats
      const pending = appsRes.data?.filter(app => app.status === "pending").length || 0;
      const approved = appsRes.data?.filter(app => app.status === "approved").length || 0;
      const pendingSupport = supportRes.data?.filter(req => req.status === "pending").length || 0;
      const pendingWithdrawals = withdrawalsRes.data?.filter(w => w.status === "pending").length || 0;
      const unverifiedDeposits = depositsRes.data?.filter(d => !d.verified).length || 0;
      const pendingDisbursements = disbursementsRes.data?.filter(d => !d.disbursed).length || 0;

      setStats({
        totalApplications: appsRes.data?.length || 0,
        pendingApplications: pending,
        approvedLoans: approved,
        pendingSupport,
        pendingWithdrawals,
        unverifiedDeposits,
        pendingDisbursements,
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Track typing status for support
  useEffect(() => {
    if (!activeTyping) return;
    const channel = supabase.channel(`typing-${activeTyping}`);
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          admin_typing: true,
          request_id: activeTyping,
          timestamp: new Date().toISOString()
        });
      }
    });
    return () => { supabase.removeChannel(channel); };
  }, [activeTyping]);

  const updateApplicationStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("loan_applications").update({ status }).eq("id", id);
      if (error) throw error;
      toast.success(`Application ${status}!`);
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateWithdrawalStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("withdrawals").update({ status }).eq("id", id);
      if (error) throw error;
      toast.success(`Withdrawal ${status}!`);
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const verifyDeposit = async (id: string, verified: boolean) => {
    try {
      const { error } = await supabase.from("savings_deposits").update({ verified }).eq("id", id);
      if (error) throw error;
      toast.success(verified ? "Deposit verified!" : "Deposit rejected!");
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSupportReply = async (requestId: string) => {
    const replyText = replies[requestId];
    if (!replyText?.trim()) {
      toast.error("Please enter a reply");
      return;
    }
    try {
      const { error } = await supabase.from("support_requests").update({ admin_reply: replyText, status: "resolved" }).eq("id", requestId);
      if (error) throw error;
      toast.success("Reply sent!");
      setReplies({ ...replies, [requestId]: "" });
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const markDisbursed = async (id: string) => {
    try {
      const { error } = await supabase.from("loan_disbursements").update({ disbursed: true }).eq("id", id);
      if (error) throw error;
      toast.success("Loan marked as disbursed!");
      fetchAllData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
      case "completed":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
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
    <div className="min-h-screen bg-gradient-soft p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img src={helaLogo} alt="Hela Loans" className="h-10 w-auto flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Manage all operations</p>
            </div>
          </div>
          <UserMenu userName={user?.user_metadata?.full_name || "Admin"} userEmail={user?.email} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3">
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Apps</p><p className="text-xl font-bold">{stats.totalApplications}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Pending Apps</p><p className="text-xl font-bold text-yellow-600">{stats.pendingApplications}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Approved</p><p className="text-xl font-bold text-green-600">{stats.approvedLoans}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Support</p><p className="text-xl font-bold text-blue-600">{stats.pendingSupport}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Withdrawals</p><p className="text-xl font-bold text-orange-600">{stats.pendingWithdrawals}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Deposits</p><p className="text-xl font-bold text-purple-600">{stats.unverifiedDeposits}</p></CardContent></Card>
          <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Disburse</p><p className="text-xl font-bold text-teal-600">{stats.pendingDisbursements}</p></CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="applications" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto">
            <TabsTrigger value="applications" className="text-xs sm:text-sm py-2"><FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Apps</TabsTrigger>
            <TabsTrigger value="support" className="text-xs sm:text-sm py-2"><MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Support</TabsTrigger>
            <TabsTrigger value="withdrawals" className="text-xs sm:text-sm py-2"><Wallet className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Withdraw</TabsTrigger>
            <TabsTrigger value="deposits" className="text-xs sm:text-sm py-2"><PiggyBank className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Deposits</TabsTrigger>
            <TabsTrigger value="disbursements" className="text-xs sm:text-sm py-2"><ArrowDownToLine className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />Disburse</TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-3">
            {applications.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">No applications</CardContent></Card>
            ) : (
              applications.map((app) => (
                <Card key={app.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{app.full_name}</p>
                        <p className="text-xs text-muted-foreground">{app.whatsapp_number} | KES {app.loan_limit.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(app.status)}
                        <Button variant="ghost" size="sm" onClick={() => setExpandedApp(expandedApp === app.id ? null : app.id)}>
                          {expandedApp === app.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    {expandedApp === app.id && (
                      <div className="space-y-3 pt-3 border-t">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-muted-foreground">ID:</span> {app.id_number}</div>
                          <div><span className="text-muted-foreground">Employment:</span> {app.employment_status}</div>
                          <div><span className="text-muted-foreground">Occupation:</span> {app.occupation}</div>
                          <div><span className="text-muted-foreground">Income:</span> {app.income_level}</div>
                          <div className="col-span-2"><span className="text-muted-foreground">Next of Kin:</span> {app.next_of_kin_name} - {app.next_of_kin_contact}</div>
                          <div className="col-span-2"><span className="text-muted-foreground">Contact Person:</span> {app.contact_person_name} - {app.contact_person_phone}</div>
                          {app.loan_reason && <div className="col-span-2"><span className="text-muted-foreground">Reason:</span> {app.loan_reason}</div>}
                        </div>
                        {app.status === "pending" && (
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" onClick={() => updateApplicationStatus(app.id, "approved")} className="flex-1"><CheckCircle className="w-4 h-4 mr-1" />Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => updateApplicationStatus(app.id, "rejected")} className="flex-1"><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-3">
            {supportRequests.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">No support requests</CardContent></Card>
            ) : (
              supportRequests.map((req) => (
                <Card key={req.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div><p className="font-semibold">{req.user_name}</p><p className="text-xs text-muted-foreground">{req.user_email}</p></div>
                      {getStatusBadge(req.status === "resolved" ? "approved" : req.status)}
                    </div>
                    <div className="bg-muted p-3 rounded-lg text-sm">{req.message}</div>
                    {req.admin_reply && <div className="bg-primary/10 p-3 rounded-lg text-sm"><span className="font-medium">Your Reply:</span> {req.admin_reply}</div>}
                    {req.status === "pending" && (
                      <div className="space-y-2">
                        <Textarea value={replies[req.id] || ""} onChange={(e) => setReplies({ ...replies, [req.id]: e.target.value })} onFocus={() => setActiveTyping(req.id)} onBlur={() => setActiveTyping(null)} placeholder="Type your reply..." className="min-h-[60px]" />
                        <Button size="sm" onClick={() => handleSupportReply(req.id)}>Send Reply</Button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Withdrawals Tab */}
          <TabsContent value="withdrawals" className="space-y-3">
            {withdrawals.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">No withdrawals</CardContent></Card>
            ) : (
              withdrawals.map((w) => (
                <Card key={w.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">KES {w.amount.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Phone: {w.phone_number}</p>
                        <p className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(w.status === "completed" ? "approved" : w.status)}
                        {w.status === "pending" && (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateWithdrawalStatus(w.id, "completed")}><CheckCircle className="w-4 h-4 mr-1" />Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => updateWithdrawalStatus(w.id, "rejected")}><XCircle className="w-4 h-4" /></Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits" className="space-y-3">
            {deposits.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">No deposits</CardContent></Card>
            ) : (
              deposits.map((d) => (
                <Card key={d.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">KES {d.amount.toLocaleString()}</p>
                        {d.transaction_code && <p className="text-sm text-muted-foreground">Code: {d.transaction_code}</p>}
                        <p className="text-xs text-muted-foreground mt-1 break-all bg-muted p-2 rounded">{d.mpesa_message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{new Date(d.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.verified ? (
                          <Badge className="bg-green-500"><BadgeCheck className="w-3 h-3 mr-1" />Verified</Badge>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => verifyDeposit(d.id, true)}><CheckCircle className="w-4 h-4 mr-1" />Verify</Button>
                            <Button size="sm" variant="destructive" onClick={() => verifyDeposit(d.id, false)}><XCircle className="w-4 h-4" /></Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Disbursements Tab */}
          <TabsContent value="disbursements" className="space-y-3">
            {disbursements.length === 0 ? (
              <Card><CardContent className="p-6 text-center text-muted-foreground">No disbursements</CardContent></Card>
            ) : (
              disbursements.map((d: any) => (
                <Card key={d.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{d.loan_applications?.full_name || "Unknown"}</p>
                        <p className="text-sm">Loan: KES {d.loan_amount.toLocaleString()} | Fee: KES {d.processing_fee.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Phone: {d.loan_applications?.whatsapp_number}</p>
                        <p className="text-xs text-muted-foreground">Code: {d.transaction_code}</p>
                        <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.disbursed ? (
                          <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Disbursed</Badge>
                        ) : (
                          <Button size="sm" onClick={() => markDisbursed(d.id)}><ArrowDownToLine className="w-4 h-4 mr-1" />Mark Disbursed</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
