import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Zap, Image, AlertTriangle, Plus, Download, Settings, ArrowLeft, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Admin() {
  const [albumForm, setAlbumForm] = useState({
    name: "",
    year: new Date().getFullYear(),
    stickers: "",
  });
  const [activeSection, setActiveSection] = useState<"dashboard" | "albums" | "settings">("dashboard");
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: albums = [] } = useQuery({
    queryKey: ["/api/albums"],
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["/api/admin/reports"],
  });

  // Query for selected album stickers
  const { data: albumStickers = [] } = useQuery({
    queryKey: ["/api/albums", selectedAlbum?.id, "stickers"],
    enabled: !!selectedAlbum,
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
    <div className="min-h-screen bg-[#fff4d6]">
      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-[#05637b] shadow-2xl min-h-screen">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-[#f8b400] rounded-lg flex items-center justify-center">
                <Zap className="text-[#052b3e] w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-white">MATCHBOX</h1>
                <p className="text-sm text-white/70">Admin Panel</p>
              </div>
            </div>

            
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => setActiveSection("dashboard")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    activeSection === "dashboard" 
                      ? "text-white bg-[#f8b400]/20 border border-[#f8b400]/30" 
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Users className={`w-4 h-4 ${activeSection === "dashboard" ? "text-[#f8b400]" : "group-hover:text-[#f8b400]"}`} />
                  <span className={activeSection === "dashboard" ? "font-medium" : ""}>Dashboard</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveSection("albums")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    activeSection === "albums" 
                      ? "text-white bg-[#f8b400]/20 border border-[#f8b400]/30" 
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Image className={`w-4 h-4 ${activeSection === "albums" ? "text-[#f8b400]" : "group-hover:text-[#f8b400]"}`} />
                  <span className={activeSection === "albums" ? "font-medium" : ""}>Album</span>
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveSection("settings")}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    activeSection === "settings" 
                      ? "text-white bg-[#f8b400]/20 border border-[#f8b400]/30" 
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Settings className={`w-4 h-4 ${activeSection === "settings" ? "text-[#f8b400]" : "group-hover:text-[#f8b400]"}`} />
                  <span className={activeSection === "settings" ? "font-medium" : ""}>Impostazioni</span>
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
              <h1 className="text-3xl font-bold text-[#052b3e]">
                {activeSection === "dashboard" && "Dashboard Amministratore"}
                {activeSection === "albums" && "Gestione Album"}
                {activeSection === "settings" && "Impostazioni"}
              </h1>
              <p className="text-[#05637b] text-lg">
                {activeSection === "dashboard" && "Gestisci album e monitora l'attività"}
                {activeSection === "albums" && "Crea e gestisci album e figurine"}
                {activeSection === "settings" && "Configura impostazioni sistema"}
              </p>
            </div>
            <div className="bg-[#f8b400] px-4 py-2 rounded-lg shadow-md">
              <p className="text-[#052b3e] font-semibold">Admin Mode</p>
            </div>
          </div>

          {/* Dashboard Content */}
          {activeSection === "dashboard" && stats && (
            <div className="grid grid-cols-4 gap-6 mb-8">
              <Card className="bg-[#05637b] border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/70">Utenti Totali</p>
                      <p className="text-3xl font-bold text-white">{(stats as any).totalUsers || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-[#f8b400] rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-[#052b3e]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#05637b] border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/70">Match Totali</p>
                      <p className="text-3xl font-bold text-white">{(stats as any).totalMatches || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-[#f8b400] rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-[#052b3e]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#05637b] border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/70">Album Attivi</p>
                      <p className="text-3xl font-bold text-white">{(stats as any).activeAlbums || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-[#f8b400] rounded-lg flex items-center justify-center">
                      <Image className="w-6 h-6 text-[#052b3e]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#05637b] border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white/70">Segnalazioni</p>
                      <p className="text-3xl font-bold text-white">{(stats as any).pendingReports || 0}</p>
                    </div>
                    <div className="w-12 h-12 bg-[#f8b400] rounded-lg flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-[#052b3e]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Albums Section */}
          {activeSection === "albums" && (
            <div className="space-y-6">
              <Card className="bg-[#05637b] border-0 shadow-lg">
                <CardHeader className="border-b border-white/10">
                  <CardTitle className="text-white text-xl flex items-center gap-2">
                    <Image className="w-5 h-5 text-[#f8b400]" />
                    Gestione Album
                  </CardTitle>
                </CardHeader>
                <CardContent className="bg-white/5 p-6">
                  <div className="text-center py-8">
                    <Image className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 text-lg">Sezione Album</p>
                    <p className="text-white/40 text-sm">Pronta per nuovi contenuti</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Dashboard Album Management - Keep existing for backward compatibility */}
          {activeSection === "dashboard" && (
          <Card className="mb-8 bg-[#05637b] border-0 shadow-lg">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#f8b400]" />
                Gestione Album
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white/5 p-6">
              {/* Album Creation Form */}
              <form onSubmit={handleCreateAlbum} className="mb-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white">Nome Album</Label>
                    <Input
                      placeholder="es. Calciatori Panini 2024"
                      value={albumForm.name}
                      onChange={(e) => setAlbumForm(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-2 bg-white border-[#f8b400]/30 focus:border-[#f8b400]"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Anno</Label>
                    <Input
                      type="number"
                      value={albumForm.year}
                      onChange={(e) => setAlbumForm(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                      className="mt-2 bg-white border-[#f8b400]/30 focus:border-[#f8b400]"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-white">Lista Figurine (una per riga)</Label>
                  <Textarea
                    rows={6}
                    className="mt-2 bg-white border-[#f8b400]/30 focus:border-[#f8b400]"
                    placeholder="1|Lionel Messi|FC Barcelona&#10;2|Cristiano Ronaldo|Juventus&#10;3|Neymar Jr|PSG"
                    value={albumForm.stickers}
                    onChange={(e) => setAlbumForm(prev => ({ ...prev, stickers: e.target.value }))}
                  />
                  <p className="text-sm text-white/70 mt-1">Formato: Numero|Nome|Team (separati da pipe |)</p>
                </div>
                <Button
                  type="submit"
                  className="bg-[#f8b400] hover:bg-[#f8b400]/90 text-[#052b3e] font-semibold"
                  disabled={createAlbumMutation.isPending}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {createAlbumMutation.isPending ? "Creando..." : "Crea Album"}
                </Button>
              </form>

              {/* Albums List */}
              <div className="space-y-4">
                <h3 className="font-medium text-white">Album Esistenti</h3>
                {(albums as any[]).map((album: any) => (
                  <div key={album.id} className="border border-[#f8b400]/30 bg-white/10 rounded-lg p-4 hover:bg-white/15 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-white">{album.name}</h4>
                        <p className="text-sm text-white/70">
                          Anno {album.year} • Creato il {new Date(album.createdAt).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={album.isActive ? "default" : "secondary"}
                          className={album.isActive ? "bg-[#f8b400] text-[#052b3e]" : "bg-white/20 text-white"}
                        >
                          {album.isActive ? "Attivo" : "Inattivo"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[#f8b400] text-[#f8b400] hover:bg-[#f8b400] hover:text-[#052b3e]"
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
          )}

          {/* Reports */}
          {activeSection === "dashboard" && (
          <Card className="bg-[#05637b] border-0 shadow-lg">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#f8b400]" />
                Segnalazioni
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white/5 p-6">
              {(reports as any[]).length === 0 ? (
                <p className="text-white/70 text-center py-4">Nessuna segnalazione</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-white">Tipo</TableHead>
                      <TableHead className="text-white">Descrizione</TableHead>
                      <TableHead className="text-white">Utente</TableHead>
                      <TableHead className="text-white">Data</TableHead>
                      <TableHead className="text-white">Stato</TableHead>
                      <TableHead className="text-white">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reports as any[]).map((report: any) => (
                      <TableRow key={report.id} className="border-white/10 hover:bg-white/5">
                        <TableCell>
                          <Badge variant="outline" className="border-[#f8b400] text-[#f8b400]">{report.type}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-white/90">{report.description}</TableCell>
                        <TableCell className="text-white/90">{report.reporter.nickname}</TableCell>
                        <TableCell className="text-white/90">
                          {new Date(report.createdAt).toLocaleDateString("it-IT")}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={report.status === "pending" ? "destructive" : "secondary"}
                            className={report.status === "pending" ? "bg-red-500 text-white" : "bg-[#f8b400] text-[#052b3e]"}
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
                                className="border-[#f8b400] text-[#f8b400] hover:bg-[#f8b400] hover:text-[#052b3e]"
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
                                className="border-white/30 text-white/70 hover:bg-white/10 hover:text-white"
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
          )}
        </main>
      </div>
    </div>
  );
}
