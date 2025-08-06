import { useQuery } from "@tanstack/react-query";
import { User } from "lucide-react";
import { MobileHeader } from "@/components/ui/mobile-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/me"],
  });

  const { data: matches = [] } = useQuery({
    queryKey: ["/api/matches"],
  });

  const stats = {
    collected: 0,
    doubles: 0,
    missing: 0,
  };

  return (
    <div className="min-h-screen bg-brand-bianco pb-20">
      <div className="bg-brand-azzurro border-b border-brand-azzurro p-4">
        <div className="flex items-center justify-center">
          <img 
            src="/matchbox-logo.png" 
            alt="MATCHBOX" 
            className="h-13 w-auto"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="p-4 grid grid-cols-3 gap-4">
        <Card className="bg-brand-azzurro text-brand-bianco border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-brand-giallo">{stats.collected}</div>
            <div className="text-xs opacity-90">Raccolte</div>
          </CardContent>
        </Card>
        <Card className="bg-brand-giallo text-brand-nero border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.doubles}</div>
            <div className="text-xs opacity-75">Doppie</div>
          </CardContent>
        </Card>
        <Card className="bg-brand-azzurro text-brand-bianco border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-brand-giallo">{stats.missing}</div>
            <div className="text-xs opacity-90">Mancanti</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Matches */}
      <div className="p-4">
        <h2 className="text-lg font-semibold text-brand-nero mb-4">Ultimi Match</h2>
        
        {matches.length === 0 ? (
          <Card className="bg-brand-azzurro border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <p className="text-brand-bianco/80 mb-4">Nessun match trovato</p>
              <Button 
                onClick={() => setLocation("/match")}
                className="bg-brand-giallo hover:bg-brand-giallo/90 text-brand-nero font-semibold shadow-md"
              >
                Trova Match
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map((match: any) => {
              const otherUser = match.user2;
              return (
                <Card key={match.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-brand-teal rounded-full flex items-center justify-center">
                          <span className="text-white font-medium">
                            {otherUser?.nickname?.[0]?.toUpperCase() || "U"}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{otherUser?.nickname}</div>
                          <div className="text-sm text-gray-500">{otherUser?.cap}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-sticker-yes">Match attivo</div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setLocation(`/chat/${match.id}`)}
                          className="text-brand-teal p-0 h-auto"
                        >
                          Chatta
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
