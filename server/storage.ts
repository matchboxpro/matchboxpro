import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq, and, desc, asc, or, sql, count } from "drizzle-orm";
import { 
  users, albums, stickers, userStickers, matches, messages, reports,
  type User, type InsertUser, type Album, type InsertAlbum, 
  type Sticker, type InsertSticker, type UserSticker, type InsertUserSticker,
  type Match, type InsertMatch, type Message, type InsertMessage,
  type Report, type InsertReport
} from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool);

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByNickname(nickname: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  
  // Albums
  getAlbums(): Promise<Album[]>;
  getAlbum(id: string): Promise<Album | undefined>;
  createAlbum(album: InsertAlbum): Promise<Album>;
  updateAlbum(id: string, updates: Partial<InsertAlbum>): Promise<Album>;
  deleteAlbum(id: string): Promise<void>;
  
  // Stickers
  getStickersByAlbum(albumId: string): Promise<Sticker[]>;
  createSticker(sticker: InsertSticker): Promise<Sticker>;
  createStickers(stickers: InsertSticker[]): Promise<Sticker[]>;
  deleteSticker(id: string): Promise<void>;
  
  // User Stickers
  getUserStickers(userId: string, albumId: string): Promise<(UserSticker & { sticker: Sticker })[]>;
  updateUserSticker(userId: string, stickerId: string, status: string): Promise<UserSticker>;
  
  // Matches
  findMatches(userId: string, albumId: string, radiusKm: number, userCap: string): Promise<User[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  getUserMatches(userId: string): Promise<(Match & { user1: User; user2: User; album: Album })[]>;
  
  // Messages
  getMatchMessages(matchId: string): Promise<(Message & { sender: User })[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Reports
  getReports(): Promise<(Report & { reporter: User; reportedUser?: User })[]>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, status: string): Promise<Report>;
  
  // Stats
  getAdminStats(): Promise<{
    totalUsers: number;
    totalMatches: number;
    activeAlbums: number;
    pendingReports: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByNickname(nickname: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.nickname, nickname)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  async getAlbums(): Promise<Album[]> {
    return await db.select().from(albums).where(eq(albums.isActive, true)).orderBy(desc(albums.createdAt));
  }

  async getAlbum(id: string): Promise<Album | undefined> {
    const result = await db.select().from(albums).where(eq(albums.id, id)).limit(1);
    return result[0];
  }

  async createAlbum(album: InsertAlbum): Promise<Album> {
    const result = await db.insert(albums).values(album).returning();
    return result[0];
  }

  async updateAlbum(id: string, updates: Partial<InsertAlbum>): Promise<Album> {
    const result = await db.update(albums).set(updates).where(eq(albums.id, id)).returning();
    return result[0];
  }

  async deleteAlbum(id: string): Promise<void> {
    await db.delete(albums).where(eq(albums.id, id));
  }

  async getStickersByAlbum(albumId: string): Promise<Sticker[]> {
    return await db.select().from(stickers).where(eq(stickers.albumId, albumId)).orderBy(asc(stickers.number));
  }

  async createSticker(sticker: InsertSticker): Promise<Sticker> {
    const result = await db.insert(stickers).values(sticker).returning();
    return result[0];
  }

  async createStickers(stickerList: InsertSticker[]): Promise<Sticker[]> {
    const result = await db.insert(stickers).values(stickerList).returning();
    return result;
  }

  async deleteSticker(id: string): Promise<void> {
    await db.delete(stickers).where(eq(stickers.id, id));
  }

  async getUserStickers(userId: string, albumId: string): Promise<(UserSticker & { sticker: Sticker })[]> {
    const result = await db
      .select({
        id: userStickers.id,
        userId: userStickers.userId,
        stickerId: userStickers.stickerId,
        status: userStickers.status,
        updatedAt: userStickers.updatedAt,
        sticker: stickers,
      })
      .from(userStickers)
      .innerJoin(stickers, eq(userStickers.stickerId, stickers.id))
      .where(and(
        eq(userStickers.userId, userId),
        eq(stickers.albumId, albumId)
      ))
      .orderBy(asc(stickers.number));
    
    return result;
  }

  async updateUserSticker(userId: string, stickerId: string, status: string): Promise<UserSticker> {
    // Try to update existing record
    const existing = await db
      .select()
      .from(userStickers)
      .where(and(
        eq(userStickers.userId, userId),
        eq(userStickers.stickerId, stickerId)
      ))
      .limit(1);

    if (existing.length > 0) {
      const result = await db
        .update(userStickers)
        .set({ status, updatedAt: new Date() })
        .where(eq(userStickers.id, existing[0].id))
        .returning();
      return result[0];
    } else {
      // Create new record
      const result = await db
        .insert(userStickers)
        .values({ userId, stickerId, status })
        .returning();
      return result[0];
    }
  }

  async findMatches(userId: string, albumId: string, radiusKm: number, userCap: string): Promise<User[]> {
    // For now, simplified matching by CAP proximity and same album
    // In a real implementation, you'd use geographical calculations
    const result = await db
      .select()
      .from(users)
      .where(and(
        eq(users.albumSelezionato, albumId),
        eq(users.cap, userCap), // Simplified - same CAP for now
        sql`${users.id} != ${userId}`
      ))
      .limit(20);
    
    return result;
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const result = await db.insert(matches).values(match).returning();
    return result[0];
  }

  async getUserMatches(userId: string): Promise<(Match & { user1: User; user2: User; album: Album })[]> {
    const result = await db
      .select({
        id: matches.id,
        user1Id: matches.user1Id,
        user2Id: matches.user2Id,
        albumId: matches.albumId,
        status: matches.status,
        createdAt: matches.createdAt,
        user1: users,
        user2: sql`NULL`.as('user2'),
        album: albums,
      })
      .from(matches)
      .innerJoin(users, eq(matches.user1Id, users.id))
      .innerJoin(albums, eq(matches.albumId, albums.id))
      .where(or(
        eq(matches.user1Id, userId),
        eq(matches.user2Id, userId)
      ))
      .orderBy(desc(matches.createdAt));

    // Get the other user for each match
    const enrichedMatches = await Promise.all(
      result.map(async (match) => {
        const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;
        const otherUser = await this.getUser(otherUserId);
        return {
          ...match,
          user2: otherUser!,
        };
      })
    );

    return enrichedMatches;
  }

  async getMatchMessages(matchId: string): Promise<(Message & { sender: User })[]> {
    const result = await db
      .select({
        id: messages.id,
        matchId: messages.matchId,
        senderId: messages.senderId,
        content: messages.content,
        createdAt: messages.createdAt,
        sender: users,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.matchId, matchId))
      .orderBy(asc(messages.createdAt));

    return result;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  async getReports(): Promise<(Report & { reporter: User; reportedUser?: User })[]> {
    const result = await db
      .select({
        id: reports.id,
        reporterId: reports.reporterId,
        reportedUserId: reports.reportedUserId,
        type: reports.type,
        description: reports.description,
        status: reports.status,
        createdAt: reports.createdAt,
        reporter: users,
        reportedUser: sql`NULL`.as('reportedUser'),
      })
      .from(reports)
      .innerJoin(users, eq(reports.reporterId, users.id))
      .orderBy(desc(reports.createdAt));

    // Get reported users where applicable
    const enrichedReports = await Promise.all(
      result.map(async (report) => {
        if (report.reportedUserId) {
          const reportedUser = await this.getUser(report.reportedUserId);
          return { ...report, reportedUser: reportedUser || undefined };
        }
        return { ...report, reportedUser: undefined };
      })
    );

    return enrichedReports;
  }

  async createReport(report: InsertReport): Promise<Report> {
    const result = await db.insert(reports).values(report).returning();
    return result[0];
  }

  async updateReport(id: string, status: string): Promise<Report> {
    const result = await db.update(reports).set({ status }).where(eq(reports.id, id)).returning();
    return result[0];
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    totalMatches: number;
    activeAlbums: number;
    pendingReports: number;
  }> {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [matchCount] = await db.select({ count: count() }).from(matches);
    const [albumCount] = await db.select({ count: count() }).from(albums).where(eq(albums.isActive, true));
    const [reportCount] = await db.select({ count: count() }).from(reports).where(eq(reports.status, 'pending'));

    return {
      totalUsers: userCount.count,
      totalMatches: matchCount.count,
      activeAlbums: albumCount.count,
      pendingReports: reportCount.count,
    };
  }
}

export const storage = new DatabaseStorage();
