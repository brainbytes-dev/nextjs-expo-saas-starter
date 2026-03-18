import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { calibrationRecords, tools, users } from "@repo/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId } = result;

    // Verify tool belongs to org
    const [tool] = await db
      .select({ id: tools.id })
      .from(tools)
      .where(and(eq(tools.id, id), eq(tools.organizationId, orgId)))
      .limit(1);

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    const records = await db
      .select({
        id: calibrationRecords.id,
        toolId: calibrationRecords.toolId,
        calibratedAt: calibrationRecords.calibratedAt,
        calibratedById: calibrationRecords.calibratedById,
        calibratedByName: users.name,
        nextCalibrationDate: calibrationRecords.nextCalibrationDate,
        certificateUrl: calibrationRecords.certificateUrl,
        result: calibrationRecords.result,
        notes: calibrationRecords.notes,
        createdAt: calibrationRecords.createdAt,
      })
      .from(calibrationRecords)
      .leftJoin(users, eq(calibrationRecords.calibratedById, users.id))
      .where(
        and(
          eq(calibrationRecords.toolId, id),
          eq(calibrationRecords.organizationId, orgId)
        )
      )
      .orderBy(desc(calibrationRecords.calibratedAt));

    return NextResponse.json({ data: records, total: records.length });
  } catch (error) {
    console.error("GET /api/tools/[id]/calibrations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calibration records" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await getSessionAndOrg(request);
    if (result.error) return result.error;
    const { db, orgId, session } = result;

    // Verify tool belongs to org
    const [tool] = await db
      .select({ id: tools.id })
      .from(tools)
      .where(and(eq(tools.id, id), eq(tools.organizationId, orgId)))
      .limit(1);

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    const body = await request.json();
    const { calibratedAt, nextCalibrationDate, certificateUrl, result: calibResult, notes } = body;

    if (!calibratedAt) {
      return NextResponse.json(
        { error: "calibratedAt is required" },
        { status: 400 }
      );
    }

    const validResults = ["pass", "fail", "conditional"];
    if (calibResult && !validResults.includes(calibResult)) {
      return NextResponse.json(
        { error: `result must be one of: ${validResults.join(", ")}` },
        { status: 400 }
      );
    }

    const [record] = await db
      .insert(calibrationRecords)
      .values({
        organizationId: orgId,
        toolId: id,
        calibratedAt: new Date(calibratedAt),
        calibratedById: session.user.id,
        nextCalibrationDate: nextCalibrationDate ?? null,
        certificateUrl: certificateUrl ?? null,
        result: calibResult ?? null,
        notes: notes ?? null,
      })
      .returning();

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("POST /api/tools/[id]/calibrations error:", error);
    return NextResponse.json(
      { error: "Failed to create calibration record" },
      { status: 500 }
    );
  }
}
