import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Zap, Image, AlertTriangle, Plus, Download, Settings, ArrowLeft, Edit, Trash2, X, Upload, FileDown, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [showStickerModal, setShowStickerModal] = useState(false);
  const [stickerFormData, setStickerFormData] = useState({
    stickers: "",
    paniniLink: ""
  });
  const [importedStickers, setImportedStickers] = useState<Array<{id: string, number: string, description: string}>>([]);
  const [editingSticker, setEditingSticker] = useState<{id: string, number: string, description: string} | null>(null);
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

  // Function to parse and import stickers
  const handleImportStickers = () => {
    if (!stickerFormData.stickers.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci la lista delle figurine da importare",
        variant: "destructive"
      });
      return;
    }

    try {
      const lines = stickerFormData.stickers.trim().split('\n');
      const parsed = lines.map((line, index) => {
        // Remove empty lines
        if (!line.trim()) return null;
        
        // Parse format: "001 - Trofeo Serie A" or "005 - Marco Carnesecchi - Atalanta"
        const match = line.match(/^\s*(\d+|[A-Za-z0-9]+)\s*[-—–]\s*(.+)$/);
        
        if (!match) return null;
        
        const [, number, description] = match;
        return {
          id: `temp_${index}`,
          number: number.trim(),
          description: description.trim()
        };
      }).filter(Boolean);

      if (parsed.length === 0) {
        toast({
          title: "Errore",
          description: "Nessuna figurina valida trovata nel formato specificato",
          variant: "destructive"
        });
        return;
      }

      setImportedStickers(parsed);
      toast({
        title: "Successo",
        description: `Importate ${parsed.length} figurine`
      });
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore nel parsing della lista figurine",
        variant: "destructive"
      });
    }
  };

  // Function to delete a sticker with confirmation
  const handleDeleteSticker = (id: string) => {
    if (window.confirm("Sei sicuro di voler eliminare questa figurina?")) {
      setImportedStickers(prev => prev.filter(sticker => sticker.id !== id));
      toast({
        title: "Figurina eliminata",
        description: "La figurina è stata rimossa dalla lista"
      });
    }
  };

  // Function to edit a sticker
  const handleEditSticker = (sticker: {id: string, number: string, description: string}) => {
    const newNumber = window.prompt("Modifica numero/codice:", sticker.number);
    if (newNumber === null) return; // User canceled
    
    const newDescription = window.prompt("Modifica descrizione:", sticker.description);
    if (newDescription === null) return; // User canceled
    
    setImportedStickers(prev => prev.map(s => 
      s.id === sticker.id 
        ? { ...s, number: newNumber.trim(), description: newDescription.trim() }
        : s
    ));
    
    toast({
      title: "Figurina modificata",
      description: "Le modifiche sono state salvate"
    });
  };

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
              {/* Header with New Album Button */}
              <Card className="bg-[#05637b] border-0 shadow-lg">
                <CardHeader className="border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-2xl flex items-center gap-3">
                      <Image className="w-6 h-6 text-[#f8b400]" />
                      Gestione Album
                    </CardTitle>
                    <Button className="bg-[#f8b400] hover:bg-[#f8b400]/90 text-[#052b3e] font-semibold px-6">
                      <Plus className="w-4 h-4 mr-2" />
                      Nuovo Album
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Albums List */}
              <div className="space-y-4">
                {/* Album 1 - Panini Calciatori 2024-25 */}
                <Card className="bg-[#fff4d6] border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-[#052b3e] mb-1">Panini Calciatori 2024-25</h3>
                        <p className="text-[#05637b] text-sm">Collezione Serie A 2024-25</p>
                      </div>
                      <div className="mb-4">
                        <p className="text-[#052b3e] font-medium">
                          <span className="text-2xl font-bold">0</span> figurine totali
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button 
                          size="sm" 
                          className="bg-[#05637b] hover:bg-[#05637b]/90 text-white font-medium px-6"
                          onClick={() => {
                            setSelectedAlbum({ name: "Panini Calciatori 2024-25", id: "album1" });
                            setShowStickerModal(true);
                          }}
                        >
                          Gestisci
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-[#05637b] text-[#05637b] hover:bg-[#05637b] hover:text-white font-medium px-6"
                        >
                          Modifica
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-medium px-6"
                        >
                          Elimina
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Album 2 - Panini Champions League 2024 */}
                <Card className="bg-[#fff4d6] border-0 shadow-lg hover:shadow-xl transition-shadow">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-[#052b3e] mb-1">Panini Champions League 2024</h3>
                        <p className="text-[#05637b] text-sm">UEFA Champions League Collection</p>
                      </div>
                      <div className="mb-4">
                        <p className="text-[#052b3e] font-medium">
                          <span className="text-2xl font-bold">0</span> figurine totali
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Button 
                          size="sm" 
                          className="bg-[#05637b] hover:bg-[#05637b]/90 text-white font-medium px-6"
                          onClick={() => {
                            setSelectedAlbum({ name: "Panini Champions League 2024", id: "album2" });
                            setShowStickerModal(true);
                          }}
                        >
                          Gestisci
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-[#05637b] text-[#05637b] hover:bg-[#05637b] hover:text-white font-medium px-6"
                        >
                          Modifica
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-medium px-6"
                        >
                          Elimina
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
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

          {/* Sticker Management Modal */}
          <Dialog open={showStickerModal} onOpenChange={setShowStickerModal}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-white" hideClose>
              <DialogHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-xl font-bold text-[#052b3e] flex items-center gap-2">
                    <Image className="w-5 h-5 text-[#05637b]" />
                    Gestisci Figurine - {selectedAlbum?.name}
                  </DialogTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowStickerModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Incolla lista figurine */}
                <div className="space-y-3">
                  <Label className="text-[#052b3e] font-medium">
                    Incolla la lista delle figurine:
                  </Label>
                  <Textarea
                    placeholder="Formato: NUMERO — NOME"
                    value={stickerFormData.stickers}
                    onChange={(e) => setStickerFormData(prev => ({ ...prev, stickers: e.target.value }))}
                    className="min-h-[200px] border-gray-200 focus:border-[#05637b] focus:ring-[#05637b]"
                  />
                </div>

                {/* Link Album Panini */}
                <div className="space-y-3">
                  <Label className="text-[#052b3e] font-medium">
                    Link Album Panini:
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="https://www.panini.it/..."
                      value={stickerFormData.paniniLink}
                      onChange={(e) => setStickerFormData(prev => ({ ...prev, paniniLink: e.target.value }))}
                      className="flex-1 border-gray-200 focus:border-[#05637b] focus:ring-[#05637b]"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-3 pt-4 border-t">
                  <Button 
                    onClick={handleImportStickers}
                    className="bg-[#05637b] hover:bg-[#05637b]/90 text-white font-medium px-6"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Importa
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700 text-white font-medium px-6">
                    <FileDown className="w-4 h-4 mr-2" />
                    Esporta
                  </Button>
                  <Button 
                    onClick={() => {
                      setImportedStickers([]);
                      setStickerFormData({ stickers: "", paniniLink: "" });
                      toast({ title: "Lista svuotata", description: "Tutte le figurine sono state rimosse" });
                    }}
                    className="bg-[#f8b400] hover:bg-[#f8b400]/90 text-[#052b3e] font-medium px-6"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Svuota
                  </Button>
                </div>

                {/* Table Header */}
                <div className="pt-4 border-t">
                  <div className="grid gap-4 font-medium text-[#052b3e] text-sm border-b pb-2" style={{gridTemplateColumns: '1fr 2fr 1fr'}}>
                    <div>Numero</div>
                    <div>Descrizione</div>
                    <div>Azioni</div>
                  </div>
                  
                  {/* Stickers List */}
                  {importedStickers.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <Image className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Nessuna figurina presente</p>
                      <p className="text-sm">Importa le figurine per iniziare</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto mt-2">
                      {importedStickers.map((sticker) => (
                        <div key={sticker.id} className="grid gap-4 p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors" style={{gridTemplateColumns: '1fr 2fr 1fr'}}>
                          <div className="font-mono text-sm text-[#05637b] font-medium">
                            {sticker.number}
                          </div>
                          <div className="text-sm text-[#052b3e]">
                            {sticker.description || "Senza descrizione"}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSticker(sticker)}
                              className="h-7 px-2 border-[#05637b] text-[#05637b] hover:bg-[#05637b] hover:text-white"
                            >
                              <Edit className="w-3 h-3" />
                              <span className="sr-only">Modifica</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteSticker(sticker.id)}
                              className="h-7 px-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span className="sr-only">Elimina</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
