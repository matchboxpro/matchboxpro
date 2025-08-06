import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Send } from "lucide-react";
import { MobileHeader } from "@/components/ui/mobile-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Chat() {
  const [, setLocation] = useLocation();
  const { matchId } = useParams();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/matches", matchId, "messages"],
    enabled: !!matchId,
    refetchInterval: 3000, // Poll for new messages every 3 seconds
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", `/api/matches/${matchId}/messages`, { content });
      return response.json();
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/matches", matchId, "messages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'invio del messaggio",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Get the other user from the first message
  const otherUser = messages.find((msg: any) => msg.senderId !== user?.id)?.sender;

  return (
    <div className="min-h-screen bg-brand-bianco flex flex-col">
      <MobileHeader
        title={otherUser?.nickname || "Chat"}
        subtitle="Online ora"
        onBack={() => setLocation("/")}
      />

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-brand-nero/60">Nessun messaggio ancora</p>
            <p className="text-sm text-brand-nero/40 mt-2">Inizia una conversazione!</p>
          </div>
        ) : (
          messages.map((msg: any) => {
            const isOwn = msg.senderId === user?.id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2 ${
                    isOwn
                      ? "bg-brand-azzurro text-brand-bianco"
                      : "bg-brand-azzurro/10 border border-brand-azzurro/20 text-brand-nero"
                  }`}
                >
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isOwn ? "opacity-75" : "opacity-75"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("it-IT", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-brand-azzurro border-t border-brand-azzurro p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <Input
            type="text"
            placeholder="Scrivi un messaggio..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 rounded-full"
          />
          <Button
            type="submit"
            size="icon"
            className="w-10 h-10 bg-brand-bianco hover:bg-brand-bianco/90 rounded-full text-brand-nero"
            disabled={!message.trim() || sendMessageMutation.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
