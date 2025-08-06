import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Zap } from "lucide-react";
import { MobileHeader } from "@/components/ui/mobile-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Match() {
  const [, setLocation] = useLocation();
  const [searchRadius, setSearchRadius] = useState([10]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data: potentialMatches = [] } = useQuery({
    queryKey: ["/api/matches/find"],
    enabled: !!user?.albumSelezionato,
  });

  const createMatchMutation = useMutation({
    mutationFn: async (user2Id: string) => {
      const response = await apiRequest("POST", "/api/matches", { user2Id });
      return response.json();
    },
    onSuccess: (match) => {
      queryClient.invalidateQueries({ queryKey: ["/api/matches"] });
      toast({
        title: "Match creato!",
        description: "Ora puoi chattare con questo utente",
      });
      setLocation(`/chat/${match.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nella creazione del match",
        variant: "destructive",
      });
    },
  });

  if (!user?.albumSelezionato) {
    return (
      <div className="min-h-screen bg-brand-azzurro pb-20">
        <MobileHeader
          title="Trova Match"
          onBack={() => setLocation("/")}
        />
        <div className="p-4 text-center">
          <p className="text-brand-nero/80 mb-4">Seleziona un album attivo per trovare match</p>
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

  return (
    <div className="min-h-screen bg-brand-azzurro pb-20">
      <MobileHeader
        title="Trova Match"
        subtitle="Trova collezionisti compatibili"
        onBack={() => setLocation("/")}
      />

      {/* Filter Options */}
      <Card className="m-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-brand-nero">Raggio di ricerca</span>
            <span className="text-sm text-brand-nero">{searchRadius[0]} km</span>
          </div>
          <Slider
            value={searchRadius}
            onValueChange={setSearchRadius}
            max={50}
            min={1}
            step={1}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* Match Results */}
      <div className="p-4 space-y-4">
        {potentialMatches.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-brand-nero/80">Nessun match trovato nella tua zona</p>
              <p className="text-sm text-brand-nero/60 mt-2">
                Prova ad aumentare il raggio di ricerca
              </p>
            </CardContent>
          </Card>
        ) : (
          potentialMatches.map((match: any) => (
            <Card key={match.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-brand-teal to-cyan-700 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {match.nickname?.[0]?.toUpperCase() || "U"}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{match.nickname}</div>
                      <div className="text-sm text-gray-500">{match.cap}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-sticker-yes">95%</div>
                    <div className="text-xs text-gray-500">compatibilità</div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-sticker-yes font-medium">?</span>
                      <span className="text-gray-600"> ti può dare</span>
                    </div>
                    <div>
                      <span className="text-brand-orange font-medium">?</span>
                      <span className="text-gray-600"> vuole da te</span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full bg-brand-teal hover:bg-brand-teal/90"
                  onClick={() => createMatchMutation.mutate(match.id)}
                  disabled={createMatchMutation.isPending}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {createMatchMutation.isPending ? "Creando..." : "Matcha!"}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
