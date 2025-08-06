import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MobileHeader } from "@/components/ui/mobile-header";
import { StickerCard } from "@/components/ui/sticker-card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Album() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<"all" | "missing" | "double">("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data: userStickers = [] } = useQuery({
    queryKey: ["/api/user-stickers", user?.albumSelezionato],
    enabled: !!user?.albumSelezionato,
  });

  const { data: stickers = [] } = useQuery({
    queryKey: ["/api/albums", user?.albumSelezionato, "stickers"],
    enabled: !!user?.albumSelezionato,
  });

  const updateStickerMutation = useMutation({
    mutationFn: async ({ stickerId, status }: { stickerId: string; status: "yes" | "no" | "double" }) => {
      const response = await apiRequest("PUT", `/api/user-stickers/${stickerId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-stickers", user?.albumSelezionato] });
      toast({
        title: "Aggiornato!",
        description: "Stato della figurina aggiornato",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento",
        variant: "destructive",
      });
    },
  });

  if (!user?.albumSelezionato) {
    return (
      <div className="min-h-screen bg-brand-azzurro pb-20">
        <MobileHeader
          title="Il Mio Album"
          onBack={() => setLocation("/")}
        />
        <div className="p-4 text-center">
          <p className="text-brand-nero/80 mb-4">Seleziona un album attivo dal tuo profilo</p>
          <Button 
            onClick={() => setLocation("/profile")}
            className="bg-brand-nero hover:bg-brand-nero/90 text-brand-bianco"
          >
            Vai al Profilo
          </Button>
        </div>
      </div>
    );
  }

  const getUserStickerStatus = (stickerId: string) => {
    const userSticker = userStickers.find((us: any) => us.stickerId === stickerId);
    return userSticker?.status;
  };

  const filteredStickers = stickers.filter((sticker: any) => {
    const status = getUserStickerStatus(sticker.id);
    if (filter === "missing") return !status || status === "no";
    if (filter === "double") return status === "double";
    return true;
  });

  return (
    <div className="min-h-screen bg-brand-azzurro pb-20">
      <MobileHeader
        title="Il Mio Album"
        subtitle="Gestisci le tue figurine"
        onBack={() => setLocation("/")}
      />

      {/* Filter Tabs */}
      <div className="bg-brand-bianco border-b border-brand-nero/20">
        <div className="flex">
          <Button
            variant="ghost"
            className={`flex-1 py-3 px-4 rounded-none border-b-2 ${
              filter === "all" 
                ? "border-brand-nero text-brand-nero" 
                : "border-transparent text-brand-nero/60"
            }`}
            onClick={() => setFilter("all")}
          >
            Tutte
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 py-3 px-4 rounded-none border-b-2 ${
              filter === "missing" 
                ? "border-brand-nero text-brand-nero" 
                : "border-transparent text-brand-nero/60"
            }`}
            onClick={() => setFilter("missing")}
          >
            Mancanti
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 py-3 px-4 rounded-none border-b-2 ${
              filter === "double" 
                ? "border-brand-nero text-brand-nero" 
                : "border-transparent text-brand-nero/60"
            }`}
            onClick={() => setFilter("double")}
          >
            Doppie
          </Button>
        </div>
      </div>

      {/* Stickers Grid */}
      <div className="p-4">
        {filteredStickers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-brand-nero/80">Nessuna figurina trovata</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {filteredStickers.map((sticker: any) => (
              <StickerCard
                key={sticker.id}
                sticker={sticker}
                status={getUserStickerStatus(sticker.id)}
                onStatusChange={(stickerId, status) => 
                  updateStickerMutation.mutate({ stickerId, status })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
