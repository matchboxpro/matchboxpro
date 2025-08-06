import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    nickname: "",
    password: "",
    cap: "",
    raggioKm: 10,
  });
  const { toast } = useToast();

  const authMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const response = await apiRequest("POST", endpoint, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: isRegister ? "Registrazione completata!" : "Accesso effettuato!",
        description: "Benvenuto in MATCHNODE",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isRegister && (!formData.cap || formData.cap.length !== 5)) {
      toast({
        title: "Errore",
        description: "Il CAP deve essere di 5 cifre",
        variant: "destructive",
      });
      return;
    }

    const submitData = isRegister ? formData : {
      nickname: formData.nickname,
      password: formData.password,
    };

    authMutation.mutate(submitData);
  };

  return (
    <div className="min-h-screen bg-brand-bianco flex flex-col justify-center p-6">
      <Card className="w-full max-w-md mx-auto bg-brand-azzurro border-brand-azzurro">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
              <img 
                src="/attached_assets/match icon_1754509310552.png" 
                alt="MATCHBOX"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-brand-bianco mb-2">MATCHBOX</h1>
            <p className="text-brand-bianco/80">Scambia le tue figurine Panini</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nickname</Label>
              <Input
                type="text"
                placeholder="Il tuo nickname"
                value={formData.nickname}
                onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                className="mt-2"
                required
              />
            </div>
            
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="La tua password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                className="mt-2"
                required
              />
            </div>

            {isRegister && (
              <div>
                <Label>CAP</Label>
                <Input
                  type="text"
                  placeholder="Il tuo CAP (5 cifre)"
                  value={formData.cap}
                  onChange={(e) => setFormData(prev => ({ ...prev, cap: e.target.value }))}
                  className="mt-2"
                  maxLength={5}
                  required
                />
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-brand-bianco hover:bg-brand-bianco/90 text-brand-nero"
              disabled={authMutation.isPending}
            >
              {authMutation.isPending 
                ? "Caricamento..." 
                : isRegister 
                  ? "Registrati" 
                  : "Accedi"
              }
            </Button>
          </form>

          <div className="text-center mt-6">
            <p className="text-brand-nero/60">
              {isRegister ? "Hai già un account?" : "Non hai un account?"}
            </p>
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-brand-bianco font-medium hover:underline"
            >
              {isRegister ? "Accedi" : "Registrati"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
