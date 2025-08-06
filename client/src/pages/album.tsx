import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ChevronRight, Check, X, Copy } from "lucide-react";

export default function Album() {
  const [, setLocation] = useLocation();
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "missing" | "double">("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  // Get all albums from admin
  const { data: albums = [] } = useQuery({
    queryKey: ["/api/albums"],
  });

  const { data: userStickers = [] } = useQuery({
    queryKey: ["/api/user-stickers", selectedAlbum],
    enabled: !!selectedAlbum,
  });

  const { data: stickers = [] } = useQuery({
    queryKey: ["/api/albums", selectedAlbum, "stickers"],
    enabled: !!selectedAlbum,
  });

  const updateStickerMutation = useMutation({
    mutationFn: async ({ stickerId, status }: { stickerId: string; status: "yes" | "no" | "double" }) => {
      const response = await apiRequest("POST", "/api/user-stickers", { 
        stickerId, 
        status,
        albumId: selectedAlbum 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-stickers", selectedAlbum] });
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
    if (filter === "missing") return !status || status === "no";
    if (filter === "double") return status === "double";
    return true;
  });

  const selectedAlbumData = albums.find((album: any) => album.id === selectedAlbum);

  return (
    <div className="min-h-screen bg-[#fff4d6] pb-20">
      <div className="bg-[#05637b] border-b border-[#05637b] p-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedAlbum(null)}
            className="text-white hover:bg-white/10"
          >
            ← Album
          </Button>
          <img 
            src="/matchbox-logo.png" 
            alt="MATCHBOX" 
            className="h-10 w-auto"
          />
          <div className="w-16"></div> {/* Spacer */}
        </div>
        
        {selectedAlbumData && (
          <div className="text-center mt-2">
            <h1 className="text-lg font-bold text-white">{selectedAlbumData.name}</h1>
            <p className="text-white/70 text-sm">{selectedAlbumData.stickerCount || 0} figurine</p>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-[#05637b] border-b border-white/20">
        <div className="flex">
          <Button
            variant="ghost"
            className={`flex-1 py-3 px-4 rounded-none border-b-2 ${
              filter === "all" 
                ? "border-[#f8b400] text-[#f8b400]" 
                : "border-transparent text-white/60"
            }`}
            onClick={() => setFilter("all")}
          >
            Tutte
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 py-3 px-4 rounded-none border-b-2 ${
              filter === "missing" 
                ? "border-[#f8b400] text-[#f8b400]" 
                : "border-transparent text-white/60"
            }`}
            onClick={() => setFilter("missing")}
          >
            Mancanti
          </Button>
          <Button
            variant="ghost"
            className={`flex-1 py-3 px-4 rounded-none border-b-2 ${
              filter === "double" 
                ? "border-[#f8b400] text-[#f8b400]" 
                : "border-transparent text-white/60"
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
    </div>
  );
}

// New component for sticker row with 3 status buttons
function StickerRow({ 
  sticker, 
  status, 
  onStatusChange 
}: { 
  sticker: any; 
  status?: string; 
  onStatusChange: (stickerId: string, status: "yes" | "no" | "double") => void;
}) {
  return (
    <Card className="bg-[#05637b] border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-[#f8b400] rounded-lg flex items-center justify-center">
              <span className="text-[#052b3e] font-bold text-lg font-mono">
                {sticker.number}
              </span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <span className="text-white text-base font-medium block truncate">
              {sticker.name || "Senza descrizione"}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              variant={status === "yes" ? "default" : "outline"}
              onClick={() => onStatusChange(sticker.id, "yes")}
              className={`h-12 w-12 p-0 rounded-xl ${
                status === "yes" 
                  ? "bg-green-600 hover:bg-green-700 text-white border-green-600 shadow-lg" 
                  : "border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white bg-white/90"
              }`}
            >
              <Check className="w-6 h-6" />
            </Button>
            <Button
              size="lg"
              variant={status === "no" ? "default" : "outline"}
              onClick={() => onStatusChange(sticker.id, "no")}
              className={`h-12 w-12 p-0 rounded-xl ${
                status === "no" 
                  ? "bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-lg" 
                  : "border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white bg-white/90"
              }`}
            >
              <X className="w-6 h-6" />
            </Button>
            <Button
              size="lg"
              variant={status === "double" ? "default" : "outline"}
              onClick={() => onStatusChange(sticker.id, "double")}
              className={`h-12 w-12 p-0 rounded-xl ${
                status === "double" 
                  ? "bg-[#f8b400] hover:bg-[#f8b400]/90 text-[#052b3e] border-[#f8b400] shadow-lg" 
                  : "border-2 border-[#f8b400] text-[#f8b400] hover:bg-[#f8b400] hover:text-[#052b3e] bg-white/90"
              }`}
            >
              <Copy className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
