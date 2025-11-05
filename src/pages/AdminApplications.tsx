import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import helaLogo from "@/assets/hela-logo.png";

const AdminApplications = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from("loan_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateApplicationStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("loan_applications")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Application ${status}!`);
      fetchApplications();
    } catch (error: any) {
      toast.error(error.message);
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
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <img src={helaLogo} alt="Hela Loans" className="h-12 w-auto" />
          <h1 className="text-3xl font-bold">Loan Applications</h1>
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {applications.map((app) => (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{app.full_name}</CardTitle>
                  <Badge variant={app.status === "approved" ? "default" : app.status === "rejected" ? "destructive" : "secondary"}>
                    {app.status === "approved" && <CheckCircle className="w-3 h-3 mr-1" />}
                    {app.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                    {app.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                    {app.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">ID Number</p>
                    <p className="font-medium">{app.id_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">WhatsApp</p>
                    <p className="font-medium">{app.whatsapp_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Loan Limit</p>
                    <p className="font-medium">KES {app.loan_limit.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employment</p>
                    <p className="font-medium">{app.employment_status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Occupation</p>
                    <p className="font-medium">{app.occupation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Income Level</p>
                    <p className="font-medium">{app.income_level}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Next of Kin</p>
                  <p className="font-medium">{app.next_of_kin_name} - {app.next_of_kin_contact}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{app.contact_person_name} - {app.contact_person_phone}</p>
                </div>

                {app.loan_reason && (
                  <div>
                    <p className="text-sm text-muted-foreground">Loan Reason</p>
                    <p className="font-medium">{app.loan_reason}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Applied On</p>
                  <p className="font-medium">{new Date(app.created_at).toLocaleString()}</p>
                </div>

                {app.status === "pending" && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={() => updateApplicationStatus(app.id, "approved")} className="flex-1">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button onClick={() => updateApplicationStatus(app.id, "rejected")} variant="destructive" className="flex-1">
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminApplications;
