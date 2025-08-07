import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import { insertUserSchema, insertAlbumSchema, insertStickerSchema, insertUserStickerSchema, insertMatchSchema, insertMessageSchema, insertReportSchema } from "@shared/schema";
import { z } from "zod";

const MemoryStoreClass = MemoryStore(session);

// Auth middleware
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

const requireAdmin = async (req: any, res: any, next: any) => {
  // Admin access is now open - remove authentication for now
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      store: new MemoryStoreClass({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
      secret: process.env.SESSION_SECRET || "matchnode-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      },
    })
  );



  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if nickname already exists
      const existingUser = await storage.getUserByNickname(userData.nickname);
      if (existingUser) {
        return res.status(400).json({ message: "Nickname già in uso" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Remove password from response
      const { password, ...userResponse } = user;
      (req.session as any).userId = user.id;
      
      res.json(userResponse);
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Errore durante la registrazione" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { nickname, password } = req.body;
      
      const user = await storage.getUserByNickname(nickname);
      if (!user) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Credenziali non valide" });
      }

      // Remove password from response
      const { password: _, ...userResponse } = user;
      (req.session as any).userId = user.id;
      
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Errore durante il login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Errore durante il logout" });
      }
      res.json({ message: "Logout effettuato con successo" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user) {
        return res.status(404).json({ message: "Utente non trovato" });
      }
      
      const { password, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recuperare i dati utente" });
    }
  });

  // User routes
  app.put("/api/users/profile", requireAuth, async (req, res) => {
    try {
      const updates = insertUserSchema.partial().parse(req.body);
      delete (updates as any).password; // Don't allow password updates through this endpoint
      
      const user = await storage.updateUser((req.session as any).userId, updates);
      const { password, ...userResponse } = user;
      
      res.json(userResponse);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Errore nell'aggiornamento del profilo" });
    }
  });

  // Album routes - con cache headers per performance
  app.get("/api/albums", async (req, res) => {
    try {
      // Cache headers per performance frontend
      res.set('Cache-Control', 'public, max-age=600'); // 10 minuti cache
      const albums = await storage.getAlbums();
      res.json(albums);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recuperare gli album" });
    }
  });

  app.post("/api/albums", requireAdmin, async (req, res) => {
    try {
      const albumData = insertAlbumSchema.parse(req.body);
      const album = await storage.createAlbum(albumData);
      res.json(album);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Errore nella creazione dell'album" });
    }
  });

  app.put("/api/albums/:id", requireAdmin, async (req, res) => {
    try {
      const albumData = insertAlbumSchema.partial().parse(req.body);
      const album = await storage.updateAlbum(req.params.id, albumData);
      res.json(album);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Errore nell'aggiornamento dell'album" });
    }
  });

  app.delete("/api/albums/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteAlbum(req.params.id);
      res.json({ message: "Album eliminato con successo" });
    } catch (error) {
      res.status(500).json({ message: "Errore nell'eliminazione dell'album" });
    }
  });

  // Sticker routes - ottimizzato per velocità
  app.get("/api/albums/:albumId/stickers", async (req, res) => {
    try {
      // Cache aggressiva per figurine che non cambiano spesso
      res.set('Cache-Control', 'public, max-age=1800'); // 30 minuti cache
      const stickers = await storage.getStickersByAlbum(req.params.albumId);
      res.json(stickers);
    } catch (error) {
      console.error("Error fetching stickers:", error);
      res.status(500).json({ message: "Errore nel recuperare le figurine" });
    }
  });

  app.post("/api/albums/:albumId/stickers", requireAdmin, async (req, res) => {
    try {
      const { stickers: stickerList } = req.body;
      
      const validatedStickers = stickerList.map((sticker: any) => 
        insertStickerSchema.parse({ ...sticker, albumId: req.params.albumId })
      );
      
      const createdStickers = await storage.createStickers(validatedStickers);
      res.json(createdStickers);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Errore nella creazione delle figurine" });
    }
  });

  // Bulk import endpoint for stickers
  app.post("/api/albums/:albumId/stickers/bulk", requireAdmin, async (req, res) => {
    try {
      const { stickers: stickerList } = req.body;
      
      const validatedStickers = stickerList.map((sticker: any) => 
        insertStickerSchema.parse({ ...sticker, albumId: req.params.albumId })
      );
      
      const createdStickers = await storage.createStickers(validatedStickers);
      res.json({ success: true, count: createdStickers.length, stickers: createdStickers });
    } catch (error) {
      console.error("Bulk import error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Errore nell'import bulk delle figurine" });
    }
  });

  // User stickers routes
  app.get("/api/user-stickers/:albumId", requireAuth, async (req, res) => {
    try {
      const userStickers = await storage.getUserStickers(
        (req.session as any).userId,
        req.params.albumId
      );
      res.json(userStickers);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recuperare le figurine dell'utente" });
    }
  });

  app.post("/api/user-stickers", requireAuth, async (req, res) => {
    try {
      const { stickerId, status, albumId } = req.body;
      
      const userSticker = await storage.updateUserSticker(
        (req.session as any).userId,
        stickerId,
        status
      );
      
      res.json(userSticker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Errore nell'aggiornamento della figurina" });
    }
  });

  app.put("/api/user-stickers/:stickerId", requireAuth, async (req, res) => {
    try {
      const { status } = insertUserStickerSchema.pick({ status: true }).parse(req.body);
      
      const userSticker = await storage.updateUserSticker(
        (req.session as any).userId,
        req.params.stickerId,
        status
      );
      
      res.json(userSticker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Errore nell'aggiornamento della figurina" });
    }
  });

  // Match routes
  app.get("/api/matches/find", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || !user.albumSelezionato) {
        return res.status(400).json({ message: "Seleziona un album attivo per trovare match" });
      }

      const potentialMatches = await storage.findMatches(
        user.id,
        user.albumSelezionato,
        user.raggioKm,
        user.cap
      );
      
      res.json(potentialMatches);
    } catch (error) {
      res.status(500).json({ message: "Errore nella ricerca di match" });
    }
  });

  app.post("/api/matches", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser((req.session as any).userId);
      if (!user || !user.albumSelezionato) {
        return res.status(400).json({ message: "Seleziona un album attivo" });
      }

      const matchData = insertMatchSchema.parse({
        user1Id: user.id,
        user2Id: req.body.user2Id,
        albumId: user.albumSelezionato,
      });
      
      const match = await storage.createMatch(matchData);
      res.json(match);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Errore nella creazione del match" });
    }
  });

  app.get("/api/matches", requireAuth, async (req, res) => {
    try {
      const matches = await storage.getUserMatches((req.session as any).userId);
      res.json(matches);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recuperare i match" });
    }
  });

  // Message routes
  app.get("/api/matches/:matchId/messages", requireAuth, async (req, res) => {
    try {
      const messages = await storage.getMatchMessages(req.params.matchId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recuperare i messaggi" });
    }
  });

  app.post("/api/matches/:matchId/messages", requireAuth, async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        matchId: req.params.matchId,
        senderId: (req.session as any).userId,
        content: req.body.content,
      });
      
      const message = await storage.createMessage(messageData);
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Errore nell'invio del messaggio" });
    }
  });

  // Report routes
  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const reportData = insertReportSchema.parse({
        ...req.body,
        reporterId: (req.session as any).userId,
      });
      
      const report = await storage.createReport(reportData);
      res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Errore nella creazione della segnalazione" });
    }
  });

  app.get("/api/admin/reports", requireAdmin, async (req, res) => {
    try {
      const reports = await storage.getReports();
      res.json(reports);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recuperare le segnalazioni" });
    }
  });

  app.put("/api/admin/reports/:id", requireAdmin, async (req, res) => {
    try {
      const { status } = req.body;
      const report = await storage.updateReport(req.params.id, status);
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Errore nell'aggiornamento della segnalazione" });
    }
  });

  // Admin stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Errore nel recuperare le statistiche" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
