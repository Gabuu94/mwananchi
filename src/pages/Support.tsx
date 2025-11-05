import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MessageSquare, Clock, CheckCircle2 } from "lucide-react";

type SupportRequest = {
  id: string;
  user_name: string;
  user_email: string;
  message: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

export default function Support() {
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [replies, setReplies] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRequests();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('support-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_requests'
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("support_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error("Failed to load support requests");
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (requestId: string) => {
    const replyText = replies[requestId];
    if (!replyText?.trim()) {
      toast.error("Please enter a reply");
      return;
    }

    try {
      const { error } = await supabase
        .from("support_requests")
        .update({
          admin_reply: replyText,
          status: "resolved",
        })
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Reply sent successfully");
      setReplies({ ...replies, [requestId]: "" });
      fetchRequests();
    } catch (error) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send reply");
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Support Requests</h1>

        <div className="space-y-4">
          {requests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No support requests yet
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        {request.user_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">{request.user_email}</p>
                    </div>
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
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Message:</p>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      {request.message}
                    </p>
                  </div>

                  {request.admin_reply && (
                    <div>
                      <p className="text-sm font-medium mb-1">Your Reply:</p>
                      <p className="text-sm text-muted-foreground bg-primary/10 p-3 rounded-lg">
                        {request.admin_reply}
                      </p>
                    </div>
                  )}

                  {request.status === "pending" && (
                    <div className="space-y-2">
                      <Textarea
                        value={replies[request.id] || ""}
                        onChange={(e) =>
                          setReplies({ ...replies, [request.id]: e.target.value })
                        }
                        placeholder="Type your reply..."
                        className="min-h-[80px]"
                      />
                      <Button onClick={() => handleReply(request.id)}>
                        Send Reply
                      </Button>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {new Date(request.created_at).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
