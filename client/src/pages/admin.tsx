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
  const [showNewAlbumModal, setShowNewAlbumModal] = useState(false);
  const [stickerFormData, setStickerFormData] = useState({
    stickers: "",
    paniniLink: ""
  });
  const [newAlbumData, setNewAlbumData] = useState({
    name: "",
    year: new Date().getFullYear(),
    stickers: ""
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
  const handleImportStickers = async () => {
    if (!selectedAlbum?.id || !stickerFormData.stickers.trim()) {
      toast({
        title: "Errore",
        description: "Seleziona un album e inserisci la lista delle figurine da importare",
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
          number: number.trim(),
          name: description.trim(),
          albumId: selectedAlbum.id
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

      // Save stickers to database via API
      const response = await apiRequest("POST", `/api/albums/${selectedAlbum.id}/stickers/bulk`, {
        stickers: parsed
      });

      if (response.ok) {
        const result = await response.json();
        
        // Refresh the stickers list
        queryClient.invalidateQueries({ queryKey: ["/api/albums", selectedAlbum.id, "stickers"] });
        
        // Clear the form
        setStickerFormData(prev => ({ ...prev, stickers: "" }));
        
        toast({
          title: "Successo",
          description: `Salvate ${result.count || parsed.length} figurine nel database`
        });
      } else {
        throw new Error("Errore nel salvataggio");
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Errore",
        description: "Errore nel salvataggio delle figurine nel database",
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
            <Button 
              onClick={() => window.location.href = '/'}
              className="bg-[#f8b400] hover:bg-[#f8b400]/90 text-[#052b3e] font-semibold px-4 py-2 shadow-md"
            >
              Vai all'App
            </Button>
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
                    <Button 
                      onClick={() => setShowNewAlbumModal(true)}
                      className="bg-[#f8b400] hover:bg-[#f8b400]/90 text-[#052b3e] font-semibold px-6"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nuovo Album
                    </Button>
                  </div>
                </CardHeader>
              </Card>

              {/* Albums List */}
              <div className="space-y-4">
                {albums.map((album: any) => (
                  <Card key={album.id} className="bg-[#fff4d6] border-0 shadow-lg hover:shadow-xl transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-xl font-bold text-[#052b3e] mb-1">{album.name}</h3>
                          <p className="text-[#05637b] text-sm">Anno {album.year}</p>
                        </div>
                        <div className="mb-4">
                          <p className="text-[#052b3e] font-medium">
                            <span className="text-2xl font-bold">{album.stickerCount || 0}</span> figurine totali
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Button 
                            size="sm" 
                            className="bg-[#05637b] hover:bg-[#05637b]/90 text-white font-medium px-6"
                            onClick={() => {
                              setSelectedAlbum(album);
                              setShowStickerModal(true);
                            }}
                          >
                            Gestisci
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              const newName = window.prompt("Modifica nome album:", album.name);
                              if (newName && newName.trim() !== "") {
                                // TODO: Implement edit album API call
                                toast({ 
                                  title: "Funzione in sviluppo", 
                                  description: "Modifica album sarà presto disponibile" 
                                });
                              }
                            }}
                            className="border-[#05637b] text-[#05637b] hover:bg-[#05637b] hover:text-white font-medium px-6"
                          >
                            Modifica
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (window.confirm(`Sei sicuro di voler eliminare l'album "${album.name}"? Questa azione eliminerà anche tutte le figurine associate.`)) {
                                // TODO: Implement delete album API call
                                toast({ 
                                  title: "Funzione in sviluppo", 
                                  description: "Eliminazione album sarà presto disponibile" 
                                });
                              }
                            }}
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white font-medium px-6"
                          >
                            Elimina
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {albums.length === 0 && (
                  <Card className="bg-[#fff4d6] border-0 shadow-lg">
                    <CardContent className="p-8 text-center">
                      <p className="text-[#052b3e] text-lg">Nessun album presente.</p>
                      <p className="text-[#05637b] text-sm mt-2">Clicca "Nuovo Album" per iniziare.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
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
          {showStickerModal && (
          <Dialog open={showStickerModal} onOpenChange={setShowStickerModal}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto bg-white">{/* Removed hideClose prop */}
              <DialogHeader className="border-b pb-4">
                <DialogTitle className="text-xl font-bold text-[#052b3e] flex items-center gap-2">
                  <Image className="w-5 h-5 text-[#05637b]" />
                  Gestisci Figurine - {selectedAlbum?.name}
                </DialogTitle>
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
                      setStickerFormData({ stickers: "", paniniLink: "" });
                      toast({ title: "Modulo svuotato", description: "Il form di importazione è stato pulito" });
                    }}
                    className="bg-[#f8b400] hover:bg-[#f8b400]/90 text-[#052b3e] font-medium px-6"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Svuota
                  </Button>
                </div>

                {/* Table Header */}
                <div className="pt-4 border-t">
                  <div className="grid gap-4 font-medium text-[#052b3e] text-sm border-b pb-2" style={{gridTemplateColumns: '80px 1fr 120px'}}>
                    <div>Numero</div>
                    <div className="text-center">Descrizione</div>
                    <div className="text-center">Azioni</div>
                  </div>
                  
                  {/* Stickers List */}
                  {albumStickers.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">
                      <Image className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>Nessuna figurina presente</p>
                      <p className="text-sm">Importa le figurine per iniziare</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto mt-2">
                      {albumStickers.map((sticker: any) => (
                        <div key={sticker.id} className="grid gap-4 p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 transition-colors" style={{gridTemplateColumns: '80px 1fr 120px'}}>
                          <div className="font-mono text-sm text-[#05637b] font-medium">
                            {sticker.number}
                          </div>
                          <div className="text-sm text-[#052b3e] break-words">
                            {sticker.name || "Senza descrizione"}
                          </div>
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const newName = window.prompt("Modifica nome:", sticker.name);
                                if (newName !== null) {
                                  // TODO: Implement edit sticker API call
                                  toast({ title: "Funzione in sviluppo", description: "Modifica figurine sarà presto disponibile" });
                                }
                              }}
                              className="h-7 px-2 border-[#05637b] text-[#05637b] hover:bg-[#05637b] hover:text-white"
                            >
                              <Edit className="w-3 h-3" />
                              <span className="sr-only">Modifica</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (window.confirm("Sei sicuro di voler eliminare questa figurina?")) {
                                  // TODO: Implement delete sticker API call
                                  toast({ title: "Funzione in sviluppo", description: "Eliminazione figurine sarà presto disponibile" });
                                }
                              }}
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
        )}

        {/* New Album Modal */}
        {showNewAlbumModal && (
          <Dialog open={showNewAlbumModal} onOpenChange={setShowNewAlbumModal}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="border-b pb-4">
                <DialogTitle className="text-xl font-bold text-[#052b3e] flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#05637b]" />
                  Crea Nuovo Album
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Album Name */}
                <div className="space-y-3">
                  <Label className="text-[#052b3e] font-medium">
                    Nome Album:
                  </Label>
                  <Input
                    placeholder="Es: Panini Calciatori 2025"
                    value={newAlbumData.name}
                    onChange={(e) => setNewAlbumData(prev => ({ ...prev, name: e.target.value }))}
                    className="border-gray-200 focus:border-[#05637b] focus:ring-[#05637b]"
                  />
                </div>

                {/* Album Year */}
                <div className="space-y-3">
                  <Label className="text-[#052b3e] font-medium">
                    Anno:
                  </Label>
                  <Input
                    type="number"
                    placeholder="2025"
                    value={newAlbumData.year}
                    onChange={(e) => setNewAlbumData(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                    className="border-gray-200 focus:border-[#05637b] focus:ring-[#05637b]"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowNewAlbumModal(false);
                      setNewAlbumData({ name: "", year: new Date().getFullYear(), stickers: "" });
                    }}
                    className="px-6"
                  >
                    Annulla
                  </Button>
                  <Button 
                    onClick={async () => {
                      if (!newAlbumData.name.trim()) {
                        toast({
                          title: "Errore",
                          description: "Inserisci il nome dell'album",
                          variant: "destructive"
                        });
                        return;
                      }

                      try {
                        const response = await apiRequest("POST", "/api/albums", {
                          name: newAlbumData.name.trim(),
                          year: newAlbumData.year
                        });

                        if (response.ok) {
                          // Refresh albums list
                          queryClient.invalidateQueries({ queryKey: ["/api/albums"] });
                          
                          setShowNewAlbumModal(false);
                          setNewAlbumData({ name: "", year: new Date().getFullYear(), stickers: "" });
                          
                          toast({
                            title: "Album creato",
                            description: `L'album "${newAlbumData.name}" è stato creato con successo`
                          });
                        } else {
                          throw new Error("Errore nella creazione");
                        }
                      } catch (error) {
                        toast({
                          title: "Errore",
                          description: "Errore nella creazione dell'album",
                          variant: "destructive"
                        });
                      }
                    }}
                    className="bg-[#05637b] hover:bg-[#05637b]/90 text-white font-medium px-6"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crea Album
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        </main>
      </div>
    </div>
  );
}
