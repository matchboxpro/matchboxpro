import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronRight, Check, X, Copy } from "lucide-react";

export default function Album() {
  const [location, setLocation] = useLocation();
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "mine" | "missing" | "double">("all");
  const [expandedSticker, setExpandedSticker] = useState<any | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset album selection when navigating back to album page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reset = params.get('reset');
    if (reset === 'true') {
      setSelectedAlbum(null);
      // Clean URL
      window.history.replaceState({}, '', '/album');
    }
  }, [location]);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
    staleTime: 5 * 60 * 1000, // 5 minuti cache
  });

  // Get all albums from admin con cache aggressiva
  const { data: albums = [] } = useQuery({
    queryKey: ["/api/albums"],
    staleTime: 10 * 60 * 1000, // 10 minuti cache
  });

  const { data: userStickers = [] } = useQuery({
    queryKey: ["/api/user-stickers", selectedAlbum],
    enabled: !!selectedAlbum,
    staleTime: 2 * 60 * 1000, // 2 minuti cache
  });

  const { data: stickers = [] } = useQuery({
    queryKey: ["/api/albums", selectedAlbum, "stickers"],
    enabled: !!selectedAlbum,
    staleTime: 10 * 60 * 1000, // Cache aggressiva - le figurine non cambiano spesso
  });

  // Prefetch ottimizzato: precaricare solo album attivo
  useEffect(() => {
    if (albums.length > 0 && !selectedAlbum) {
      // Prefetch solo primo album (quello più probabile da selezionare)
      const firstAlbum = albums[0];
      if (firstAlbum) {
        queryClient.prefetchQuery({
          queryKey: ["/api/albums", firstAlbum.id, "stickers"],
          staleTime: 30 * 60 * 1000, // Cache più aggressiva
        });
      }
    }
  }, [albums, selectedAlbum, queryClient]);

  const updateStickerMutation = useMutation({
    mutationFn: async ({ stickerId, status }: { stickerId: string; status: "yes" | "no" | "double" }) => {
      const response = await apiRequest("POST", "/api/user-stickers", { 
        stickerId, 
        status,
        albumId: selectedAlbum 
      });
      return response.json();
    },
    onMutate: async ({ stickerId, status }) => {
      // Ottimizzazione: aggiornamento ottimistico per UI istantanea
      await queryClient.cancelQueries({ queryKey: ["/api/user-stickers", selectedAlbum] });
      
      const previousData = queryClient.getQueryData(["/api/user-stickers", selectedAlbum]);
      
      queryClient.setQueryData(["/api/user-stickers", selectedAlbum], (old: any) => {
        if (!old) return old;
        
        const existingIndex = old.findIndex((us: any) => us.stickerId === stickerId);
        if (existingIndex >= 0) {
          // Aggiorna esistente
          const newData = [...old];
          newData[existingIndex] = { ...newData[existingIndex], status };
          return newData;
        } else {
          // Aggiungi nuovo
          return [...old, { stickerId, status, userId: user?.id }];
        }
      });
      
      return { previousData };
    },
    onError: (error: any, variables, context) => {
      // Rollback in caso di errore
      if (context?.previousData) {
        queryClient.setQueryData(["/api/user-stickers", selectedAlbum], context.previousData);
      }
      toast({
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento",
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Sincronizza con il server
      queryClient.invalidateQueries({ queryKey: ["/api/user-stickers", selectedAlbum] });
    },
  });

  // Ottimizzazione: Auto-set batch più intelligente per velocità
  const autoSetMissingMutation = useMutation({
    mutationFn: async () => {
      // Trova solo le figurine che non hanno ancora uno stato
      const stickersWithoutStatus = stickers.filter((sticker: any) => {
        return !userStickers.find((us: any) => us.stickerId === sticker.id);
      });
      
      if (stickersWithoutStatus.length === 0) return;
      
      // Batch più piccoli per migliori performance (max 20 alla volta)
      const batchSize = 20;
      const batches = [];
      for (let i = 0; i < stickersWithoutStatus.length; i += batchSize) {
        batches.push(stickersWithoutStatus.slice(i, i + batchSize));
      }
      
      // Processa batch sequenzialmente per evitare sovraccarico DB
      for (const batch of batches) {
        const promises = batch.map((sticker: any) => {
          return apiRequest("POST", "/api/user-stickers", { 
            stickerId: sticker.id, 
            status: "no",
            albumId: selectedAlbum 
          });
        });
        await Promise.all(promises);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-stickers", selectedAlbum] });
    },
  });

  // Auto-set solo quando ci sono figurine senza stato - ottimizzato per evitare auto-set inutili
  useEffect(() => {
    if (!selectedAlbum || !stickers.length || userStickers.length >= stickers.length) return;
    
    const stickersWithoutStatus = stickers.filter((sticker: any) => {
      return !userStickers.find((us: any) => us.stickerId === sticker.id);
    });
    
    // Solo se ci sono molte figurine senza stato (evita micro-batch inutili)
    if (stickersWithoutStatus.length > 10 && !autoSetMissingMutation.isPending) {
      autoSetMissingMutation.mutate();
    }
  }, [stickers, userStickers, selectedAlbum]);

  // If no album selected, show album selection
  if (!selectedAlbum) {
    return (
      <div className="min-h-screen bg-[#fff4d6] pb-20">
        <div className="bg-[#05637b] border-b border-[#05637b] p-4">
          <div className="flex items-center justify-center">
            <img 
              src="/matchbox-logo.png" 
              alt="MATCHBOX" 
              className="h-10 w-auto"
            />
          </div>
        </div>
        
        <div className="p-4">
          <h2 className="text-xl font-bold text-[#052b3e] mb-6 text-center">
            Seleziona un album attivo dal tuo profilo
          </h2>
          
          {albums.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-[#052b3e]/70 mb-4">Nessun album disponibile</p>
              <Button 
                onClick={() => setLocation("/profile")}
                className="bg-[#05637b] hover:bg-[#05637b]/90 text-white"
              >
                Vai al Profilo
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {albums.map((album: any) => (
                <Card 
                  key={album.id} 
                  className="bg-[#05637b] border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => setSelectedAlbum(album.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-white">{album.name}</h3>
                        <p className="text-white/70 text-sm">
                          {album.stickerCount || 0} figurine disponibili
                        </p>
                      </div>
                      <ChevronRight className="w-6 h-6 text-[#f8b400]" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Admin Button */}
        <div className="fixed bottom-4 left-4">
          <Button
            onClick={() => window.location.href = '/admin'}
            variant="ghost"
            size="sm"
            className="text-xs text-gray-400 hover:text-gray-600 opacity-50 hover:opacity-100 transition-opacity"
          >
            Admin
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
    if (filter === "mine") return status === "yes";
    if (filter === "missing") return !status || status === "no";
    if (filter === "double") return status === "double";
    return true;
  });

  const selectedAlbumData = albums.find((album: any) => album.id === selectedAlbum);

  return (
    <div className="min-h-screen bg-[#fff4d6] pb-20">
      <div className="bg-[#05637b] border-b border-[#05637b] p-4">
        <div className="flex items-center justify-center">
          <img 
            src="/matchbox-logo.png" 
            alt="MATCHBOX" 
            className="h-10 w-auto"
          />
        </div>
        
        {selectedAlbumData && (
          <div className="text-center mt-2">
            <h1 className="text-lg font-bold text-white">{selectedAlbumData.name}</h1>
            <p className="text-white/70 text-sm">{selectedAlbumData.stickerCount || 0} figurine</p>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-[#05637b] border-b border-white/20 p-2">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className={`flex-1 py-3 px-4 rounded-lg font-medium ${
              filter === "all" 
                ? "bg-[#f8b400] text-[#052b3e]" 
                : "text-white hover:bg-white/10"
            }`}
            onClick={() => setFilter("all")}
          >
            Tutte
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 py-3 px-4 rounded-lg font-medium ${
              filter === "mine" 
                ? "bg-[#f8b400] text-[#052b3e]" 
                : "text-white hover:bg-white/10"
            }`}
            onClick={() => setFilter("mine")}
          >
            Mie
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 py-3 px-4 rounded-lg font-medium ${
              filter === "missing" 
                ? "bg-[#f8b400] text-[#052b3e]" 
                : "text-white hover:bg-white/10"
            }`}
            onClick={() => setFilter("missing")}
          >
            Mancanti
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 py-3 px-4 rounded-lg font-medium ${
              filter === "double" 
                ? "bg-[#f8b400] text-[#052b3e]" 
                : "text-white hover:bg-white/10"
            }`}
            onClick={() => setFilter("double")}
          >
            Doppie
          </Button>
        </div>
      </div>

      {/* Stickers List */}
      <div className="p-4">
        {filteredStickers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#052b3e]/70">Nessuna figurina trovata</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStickers.map((sticker: any) => (
              <StickerRow
                key={sticker.id}
                sticker={sticker}
                status={getUserStickerStatus(sticker.id)}
                onStatusChange={(stickerId, status) => 
                  updateStickerMutation.mutate({ stickerId, status })
                }
                onNameClick={() => setExpandedSticker(sticker)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Admin Button */}
      <div className="fixed bottom-4 left-4">
        <Button
          onClick={() => window.location.href = '/admin'}
          variant="ghost"
          size="sm"
          className="text-xs text-gray-400 hover:text-gray-600 opacity-50 hover:opacity-100 transition-opacity"
        >
          Admin
        </Button>
      </div>

      {/* Expanded Sticker Dialog */}
      <Dialog open={!!expandedSticker} onOpenChange={() => setExpandedSticker(null)}>
        <DialogContent className="bg-[#05637b] border-0 text-white">
          <DialogHeader>
            <DialogTitle className="text-[#f8b400] text-xl">
              Figurina #{expandedSticker?.number}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-white text-lg leading-relaxed">
              {expandedSticker?.name || "Senza descrizione"}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// New component for sticker row with 3 status buttons
function StickerRow({ 
  sticker, 
  status, 
  onStatusChange,
  onNameClick
}: { 
  sticker: any; 
  status?: string; 
  onStatusChange: (stickerId: string, status: "yes" | "no" | "double") => void;
  onNameClick: () => void;
}) {
  const handleStatusChange = (newStatus: "yes" | "no" | "double") => {
    // Regola importante: DOPPIA può essere flaggata solo se SI è già flaggato
    if (newStatus === "double" && status !== "yes") {
      // Prima flagga SI, poi DOPPIA
      onStatusChange(sticker.id, "yes");
      setTimeout(() => {
        onStatusChange(sticker.id, "double");
      }, 100);
      return;
    }
    
    // Regola importante: se flaggo SI, automaticamente deseleziono NO
    // e viceversa - i pulsanti SI e NO sono mutuamente esclusivi
    onStatusChange(sticker.id, newStatus);
  };

  // Determina se il pulsante DOPPIA deve essere disabilitato
  const isDoubleDisabled = status !== "yes" && status !== "double";

  return (
    <Card className="bg-[#0a7a96] border-0 shadow-sm">
      <CardContent className="p-3">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-9 bg-[#f8b400] rounded-lg flex items-center justify-center">
              <span className="text-[#052b3e] font-bold text-lg font-mono">
                {sticker.number}
              </span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onNameClick}>
            <span className="text-white text-base font-medium block truncate hover:text-[#f8b400] transition-colors">
              {sticker.name || "Senza descrizione"}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleStatusChange("yes")}
              className={`h-9 w-9 p-0 rounded-xl transition-all ${
                status === "yes" || status === "double"
                  ? "bg-green-600 border-green-600 text-white shadow-lg" 
                  : "border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white bg-white/90"
              }`}
            >
              <Check className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleStatusChange("no")}
              className={`h-9 w-9 p-0 rounded-xl transition-all ${
                status === "no" 
                  ? "bg-red-600 border-red-600 text-white shadow-lg" 
                  : "border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white bg-white/90"
              }`}
            >
              <X className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleStatusChange("double")}
              disabled={isDoubleDisabled}
              className={`h-9 w-9 p-0 rounded-xl transition-all ${
                status === "double" 
                  ? "bg-[#d4a504] border-[#d4a504] text-white shadow-lg" 
                  : isDoubleDisabled
                    ? "border-2 border-gray-400 text-gray-400 bg-gray-200 cursor-not-allowed opacity-50"
                    : "border-2 border-[#d4a504] text-[#d4a504] hover:bg-[#d4a504] hover:text-white bg-white/90"
              }`}
            >
              <Copy className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
