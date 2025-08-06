import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Crown } from "lucide-react";
import { MobileHeader } from "@/components/ui/mobile-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Profile() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data: albums = [] } = useQuery({
    queryKey: ["/api/albums"],
  });

  const [formData, setFormData] = useState({
    nickname: "",
    cap: "",
    raggioKm: 10,
    albumSelezionato: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        nickname: user.nickname || "",
        cap: user.cap || "",
        raggioKm: user.raggioKm || 10,
        albumSelezionato: user.albumSelezionato || "",
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("PUT", "/api/users/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Profilo aggiornato!",
        description: "Le modifiche sono state salvate",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento del profilo",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      queryClient.clear();
      setLocation("/login");
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante il logout",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-brand-bianco flex items-center justify-center">
        <p className="text-brand-nero/60">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bianco pb-20">
      <div className="bg-brand-azzurro border-b border-brand-azzurro p-2">
        <div className="flex items-center justify-center">
          <img 
            src="/matchbox-logo.png" 
            alt="MATCHBOX" 
            className="h-10 w-auto"
          />
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Profile Header */}
        <Card className="bg-brand-azzurro border-0 shadow-lg">
          <CardContent className="pt-6 text-center">
            <div className="w-20 h-20 bg-brand-giallo rounded-full mx-auto mb-3 flex items-center justify-center shadow-md">
              <span className="text-brand-nero text-2xl font-bold">
                {user.nickname?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-brand-bianco">{user.nickname}</h2>
            <p className="text-brand-bianco/80">
              Collezionista dal {new Date(user.startTrial).toLocaleDateString("it-IT", {
                month: "short",
                year: "numeric"
              })}
            </p>
          </CardContent>
        </Card>

        {/* Settings Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nickname</Label>
                <Input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>CAP</Label>
                <Input
                  type="text"
                  value={formData.cap}
                  onChange={(e) => setFormData(prev => ({ ...prev, cap: e.target.value }))}
                  className="mt-2"
                  maxLength={5}
                />
              </div>

              <div>
                <Label>Raggio di ricerca: {formData.raggioKm} km</Label>
                <Slider
                  value={[formData.raggioKm]}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, raggioKm: value[0] }))}
                  max={50}
                  min={1}
                  step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-brand-bianco/60 mt-1">
                  <span>1 km</span>
                  <span>50 km</span>
                </div>
              </div>

              <div>
                <Label>Album Attivo</Label>
                <Select
                  value={formData.albumSelezionato}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, albumSelezionato: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Seleziona un album" />
                  </SelectTrigger>
                  <SelectContent>
                    {albums.map((album: any) => (
                      <SelectItem key={album.id} value={album.id}>
                        {album.name} ({album.year})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                className="w-full bg-brand-bianco hover:bg-brand-bianco/90 text-brand-nero"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? "Salvando..." : "Salva Modifiche"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Premium Status */}
        <Card className="bg-gradient-to-r from-brand-giallo to-brand-giallo/80 text-brand-nero border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Stato Premium</h3>
                <p className="text-sm opacity-90">
                  {user.isPremium ? "Premium attivo" : "Trial attivo"}
                </p>
              </div>
              <Crown className="w-8 h-8" />
            </div>
          </CardContent>
        </Card>

        {/* Logout Button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleLogout}
        >
          Esci
        </Button>
      </div>
      
      {/* Admin Button - Discreto a fondo pagina */}
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
