import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, X, Send, Loader2, Headset } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";

type Message = { role: "user" | "assistant"; content: string };

export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi! I'm your Hela Loans assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [adminTyping, setAdminTyping] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Load previous support messages when opening chat
  useEffect(() => {
    if (isOpen) {
      loadSupportMessages();
      subscribeToSupportUpdates();
    }
  }, [isOpen]);

  const loadSupportMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: requests } = await supabase
        .from("support_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (requests && requests.length > 0) {
        const supportMessages: Message[] = [];
        const latestPending = requests.find(r => r.status === 'pending');
        if (latestPending) {
          setCurrentRequestId(latestPending.id);
        }
        
        requests.forEach(req => {
          supportMessages.push({ 
            role: "user", 
            content: `[Support Request] ${req.message}` 
          });
          if (req.admin_reply) {
            supportMessages.push({ 
              role: "assistant", 
              content: `[Admin Reply] ${req.admin_reply}` 
            });
          }
        });
        setMessages(prev => [...prev, ...supportMessages]);
      }
    } catch (error) {
      console.error("Error loading support messages:", error);
    }
  };

  // Listen for admin typing
  useEffect(() => {
    if (!currentRequestId || !isOpen) return;

    const channel = supabase.channel(`typing-${currentRequestId}`);
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const isTyping = Object.keys(state).length > 0;
        setAdminTyping(isTyping);
      })
      .on('presence', { event: 'join' }, () => {
        setAdminTyping(true);
      })
      .on('presence', { event: 'leave' }, () => {
        setAdminTyping(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRequestId, isOpen]);

  const subscribeToSupportUpdates = () => {
    const channel = supabase
      .channel('support-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_requests'
        },
        (payload: any) => {
          if (payload.new.admin_reply && payload.new.admin_reply !== payload.old.admin_reply) {
            setMessages(prev => [...prev, {
              role: "assistant",
              content: `[Admin Reply] ${payload.new.admin_reply}`
            }]);
            toast.success("New reply from admin!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const streamChat = async (userMessage: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
    
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, { role: "user", content: userMessage }] }),
      });

      if (resp.status === 429) {
        toast.error("Rate limit exceeded. Please try again later.");
        return;
      }
      if (resp.status === 402) {
        toast.error("Service temporarily unavailable. Please try again later.");
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Failed to start stream");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: "assistant", content: assistantContent };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to send message. Please try again.");
      setMessages((prev) => prev.slice(0, -1));
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    await streamChat(userMessage);
    setIsLoading(false);
  };

  const handleSupportRequest = async () => {
    if (!supportMessage.trim()) {
      toast.error("Please enter a message");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to contact support");
        return;
      }

      const { data: newRequest, error } = await supabase
        .from("support_requests")
        .insert({
          user_id: user.id,
          user_email: user.email || "",
          user_name: user.user_metadata?.full_name || user.email || "User",
          message: supportMessage,
        })
        .select()
        .single();

      if (error) throw error;

      // Set current request ID for typing indicator
      if (newRequest) {
        setCurrentRequestId(newRequest.id);
      }

      // Add to chat messages
      setMessages(prev => [...prev, {
        role: "user",
        content: `[Support Request] ${supportMessage}`
      }, {
        role: "assistant",
        content: "Your support request has been sent to our team. You'll see the admin's reply right here in this chat!"
      }]);

      toast.success("Support request sent!");
      setSupportMessage("");
      setShowSupportForm(false);
    } catch (error) {
      console.error("Error sending support request:", error);
      toast.error("Failed to send support request");
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          size="icon"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed inset-4 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-96 sm:h-[500px] h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] shadow-xl z-50 flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Hela Assistant
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 break-words ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {adminTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <p className="text-sm text-muted-foreground">
                        Admin is typing...
                      </p>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-4">
              {showSupportForm ? (
                <div className="space-y-3">
                  <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                    <p className="font-medium text-foreground mb-1">Contacting Support</p>
                    <p>Please describe your issue in detail. Include any relevant information like transaction codes, dates, or error messages. A support agent will reply shortly.</p>
                  </div>
                  <Textarea
                    value={supportMessage}
                    onChange={(e) => setSupportMessage(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSupportRequest} className="flex-1">
                      Send to Support
                    </Button>
                    <Button variant="outline" onClick={() => setShowSupportForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSupportForm(true)}
                      className="w-full"
                    >
                      <Headset className="w-4 h-4 mr-2" />
                      Talk to Support
                    </Button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSend();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type your message..."
                      disabled={isLoading}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
