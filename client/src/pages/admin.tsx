import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Zap, Image, AlertTriangle, Plus, Download, LogOut, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
      const response = await apiRequest("POST", "/api/auth/admin", data);
      return response.json();
    },
    onSuccess: () => {
      onLogin();
      toast({
        title: "Accesso effettuato",
        description: "Benvenuto nell'area amministrativa",
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Credenziali non valide",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(credentials);
  };

  return (
    <div className="min-h-screen bg-[#fff4d6] flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-[#05637b] border-0 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-white">MATCHBOX Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-white">Username</Label>
              <Input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                placeholder="ADMIN"
                className="bg-white"
                required
              />
            </div>
            <div>
              <Label className="text-white">Password</Label>
              <Input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                placeholder="1404"
                className="bg-white"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-[#f8b400] hover:bg-[#f8b400]/90 text-[#052b3e]"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Accesso..." : "Accedi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Admin() {
  const [albumForm, setAlbumForm] = useState({
    name: "",
    year: new Date().getFullYear(),
    stickers: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: adminStatus } = useQuery({
    queryKey: ["/api/auth/admin-status"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
    enabled: adminStatus?.authenticated,
  });

  const { data: albums = [] } = useQuery({
    queryKey: ["/api/albums"],
    enabled: adminStatus?.authenticated,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["/api/admin/reports"],
    enabled: adminStatus?.authenticated,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/admin-logout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/admin-status"] });
      toast({
        title: "Disconnesso",
        description: "Sessione admin terminata",
      });
    },
  });

  const createAlbumMutation = useMutation({
    mutationFn: async (data: any) => {
      // First create the album
      const albumResponse = await apiRequest("POST", "/api/albums", {
        name: data.name,
        year: data.year,
      });
      const album = await albumResponse.json();

      // Then parse and create stickers
      if (data.stickers.trim()) {
        const stickerLines = data.stickers.trim().split('\n');
        const stickers = stickerLines.map((line: string) => {
          const [number, name, team] = line.split('|').map(s => s.trim());
          return { number, name, team: team || null };
        });

        await apiRequest("POST", `/api/albums/${album.id}/stickers`, { stickers });
      }

      return album;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/albums"] });
      setAlbumForm({ name: "", year: new Date().getFullYear(), stickers: "" });
      toast({
        title: "Album creato!",
        description: "Album e figurine create con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nella creazione dell'album",
        variant: "destructive",
      });
    },
  });

  const deleteAlbumMutation = useMutation({
    mutationFn: async (albumId: string) => {
      await apiRequest("DELETE", `/api/albums/${albumId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/albums"] });
      toast({
        title: "Album eliminato",
        description: "Album eliminato con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'eliminazione dell'album",
        variant: "destructive",
      });
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/admin/reports/${reportId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      toast({
        title: "Segnalazione aggiornata",
        description: "Status della segnalazione aggiornato",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'aggiornamento della segnalazione",
        variant: "destructive",
      });
    },
  });

  // Show admin login if not authenticated
  if (!adminStatus?.authenticated) {
    return <AdminLogin onLogin={() => queryClient.invalidateQueries({ queryKey: ["/api/auth/admin-status"] })} />;
  }

  const handleCreateAlbum = (e: React.FormEvent) => {
    e.preventDefault();
    if (!albumForm.name.trim()) {
      toast({
        title: "Errore",
        description: "Il nome dell'album è obbligatorio",
        variant: "destructive",
      });
      return;
    }
    createAlbumMutation.mutate(albumForm);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-lg min-h-screen">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-brand-azzurro rounded-lg flex items-center justify-center">
                <Zap className="text-white w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">MATCHBOX</h1>
                <p className="text-sm text-gray-600">Admin Panel</p>
              </div>
            </div>
            
            {/* Logout Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => logoutMutation.mutate()}
              className="w-full mb-6 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
            
            <ul className="space-y-2">
              <li>
                <div className="flex items-center space-x-3 px-4 py-3 text-brand-azzurro bg-blue-50 rounded-lg">
                  <Users className="w-4 h-4" />
                  <span>Dashboard</span>
                </div>
              </li>
              <li>
                <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-brand-azzurro hover:bg-blue-50 rounded-lg transition-colors">
                  <Image className="w-4 h-4" />
                  <span>Album</span>
                </button>
              </li>
              <li>
                <button className="w-full flex items-center space-x-3 px-4 py-3 text-gray-600 hover:text-brand-azzurro hover:bg-blue-50 rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>Impostazioni</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard Amministratore</h1>
              <p className="text-gray-600">Gestisci album e monitora l'attività</p>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-4 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Utenti Totali</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Match Totali</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalMatches}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Album Attivi</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeAlbums}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Image className="w-6 h-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Segnalazioni</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.pendingReports}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Album Management */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Gestione Album</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Album Creation Form */}
              <form onSubmit={handleCreateAlbum} className="mb-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nome Album</Label>
                    <Input
                      placeholder="es. Calciatori Panini 2024"
                      value={albumForm.name}
                      onChange={(e) => setAlbumForm(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label>Anno</Label>
                    <Input
                      type="number"
                      value={albumForm.year}
                      onChange={(e) => setAlbumForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className="mt-2"
                    />
                  </div>
                </div>
                <div>
                  <Label>Lista Figurine (una per riga)</Label>
                  <Textarea
                    rows={6}
                    placeholder="1|Lionel Messi|FC Barcelona&#10;2|Cristiano Ronaldo|Juventus&#10;3|Neymar Jr|PSG"
                    value={albumForm.stickers}
                    onChange={(e) => setAlbumForm(prev => ({ ...prev, stickers: e.target.value }))}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">Formato: Numero|Nome|Team (separati da pipe |)</p>
                </div>
                <Button
                  type="submit"
                  className="bg-brand-teal hover:bg-brand-teal/90"
                  disabled={createAlbumMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {createAlbumMutation.isPending ? "Creando..." : "Crea Album"}
                </Button>
              </form>

              {/* Albums List */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Album Esistenti</h3>
                {albums.map((album: any) => (
                  <div key={album.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{album.name}</h4>
                        <p className="text-sm text-gray-600">
                          Anno {album.year} • Creato il {new Date(album.createdAt).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={album.isActive ? "default" : "secondary"}>
                          {album.isActive ? "Attivo" : "Inattivo"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteAlbumMutation.mutate(album.id)}
                          disabled={deleteAlbumMutation.isPending}
                        >
                          Elimina
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Segnalazioni</CardTitle>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nessuna segnalazione</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrizione</TableHead>
                      <TableHead>Utente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report: any) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <Badge variant="outline">{report.type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{report.description}</TableCell>
                        <TableCell>{report.reporter.nickname}</TableCell>
                        <TableCell>
                          {new Date(report.createdAt).toLocaleDateString("it-IT")}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={report.status === "pending" ? "destructive" : "secondary"}
                          >
                            {report.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {report.status === "pending" && (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateReportMutation.mutate({ 
                                  reportId: report.id, 
                                  status: "resolved" 
                                })}
                              >
                                Risolvi
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateReportMutation.mutate({ 
                                  reportId: report.id, 
                                  status: "dismissed" 
                                })}
                              >
                                Ignora
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
