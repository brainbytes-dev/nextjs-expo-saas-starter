import { getDb } from "@repo/db";
import {
  users,
  stockChanges,
  toolBookings,
  timeEntries,
  comments,
  commissions,
  commissionEntries,
} from "@repo/db/schema";
import { eq } from "drizzle-orm";

export interface DsgvoData {
  exportedAt: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  stockChanges: Array<{
    id: string;
    changeType: string;
    quantity: number;
    notes: string | null;
    createdAt: Date;
  }>;
  toolBookings: Array<{
    id: string;
    bookingType: string;
    notes: string | null;
    createdAt: Date;
  }>;
  timeEntries: Array<{
    id: string;
    description: string | null;
    startTime: Date;
    endTime: Date | null;
    durationMinutes: number | null;
    billable: boolean | null;
    status: string;
    createdAt: Date;
  }>;
  comments: Array<{
    id: string;
    entityType: string;
    entityId: string;
    body: string;
    createdAt: Date;
  }>;
  commissionEntries: Array<{
    id: string;
    commissionId: string;
    commissionName: string;
    quantity: number | null;
    pickedQuantity: number | null;
    status: string | null;
    notes: string | null;
    createdAt: Date;
  }>;
}

/**
 * Collects all personal data for a given user across all tables.
 * Used for DSGVO Art. 15 data export.
 */
export async function collectUserData(userId: string): Promise<DsgvoData> {
  const db = getDb();

  // Run all queries in parallel for efficiency
  const [
    userRows,
    stockRows,
    bookingRows,
    timeRows,
    commentRows,
    commissionRows,
  ] = await Promise.all([
    // User profile
    db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),

    // Stock changes by user
    db
      .select({
        id: stockChanges.id,
        changeType: stockChanges.changeType,
        quantity: stockChanges.quantity,
        notes: stockChanges.notes,
        createdAt: stockChanges.createdAt,
      })
      .from(stockChanges)
      .where(eq(stockChanges.userId, userId)),

    // Tool bookings by user
    db
      .select({
        id: toolBookings.id,
        bookingType: toolBookings.bookingType,
        notes: toolBookings.notes,
        createdAt: toolBookings.createdAt,
      })
      .from(toolBookings)
      .where(eq(toolBookings.userId, userId)),

    // Time entries by user
    db
      .select({
        id: timeEntries.id,
        description: timeEntries.description,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        durationMinutes: timeEntries.durationMinutes,
        billable: timeEntries.billable,
        status: timeEntries.status,
        createdAt: timeEntries.createdAt,
      })
      .from(timeEntries)
      .where(eq(timeEntries.userId, userId)),

    // Comments by user
    db
      .select({
        id: comments.id,
        entityType: comments.entityType,
        entityId: comments.entityId,
        body: comments.body,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .where(eq(comments.userId, userId)),

    // Commission entries where user is responsible (via commissions.responsibleId)
    db
      .select({
        id: commissionEntries.id,
        commissionId: commissionEntries.commissionId,
        commissionName: commissions.name,
        quantity: commissionEntries.quantity,
        pickedQuantity: commissionEntries.pickedQuantity,
        status: commissionEntries.status,
        notes: commissionEntries.notes,
        createdAt: commissionEntries.createdAt,
      })
      .from(commissionEntries)
      .innerJoin(
        commissions,
        eq(commissionEntries.commissionId, commissions.id)
      )
      .where(eq(commissions.responsibleId, userId)),
  ]);

  const user = userRows[0];
  if (!user) {
    throw new Error("Benutzer nicht gefunden");
  }

  return {
    exportedAt: new Date().toISOString(),
    user,
    stockChanges: stockRows,
    toolBookings: bookingRows,
    timeEntries: timeRows,
    comments: commentRows,
    commissionEntries: commissionRows,
  };
}
