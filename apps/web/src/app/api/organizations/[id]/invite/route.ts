import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { organizationMembers, users, organizations } from "@repo/db/schema";
import { eq, and } from "drizzle-orm";
import { sendTeamInviteEmail } from "@/lib/email";
import * as Sentry from "@sentry/nextjs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const headers = new Headers(request.headers);
    headers.set("x-organization-id", id);

    const result = await getSessionAndOrg(new Request(request.url, { headers }));
    if (result.error) return result.error;
    const { db, orgId, session, membership } = result;

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "Nur Eigentümer und Admins können Mitglieder einladen" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role = "member" } = body;

    if (!email) {
      return NextResponse.json(
        { error: "E-Mail-Adresse ist erforderlich" },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "Ungültige E-Mail-Adresse" },
        { status: 400 }
      );
    }

    if (!["admin", "member"].includes(role)) {
      return NextResponse.json(
        { error: "Ungültige Rolle. Erlaubt: admin, member" },
        { status: 400 }
      );
    }

    // Fetch org name and inviter name for the email
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    const [inviter] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    // Check if a user with this email already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      // Check if already a member of this org
      const [existingMember] = await db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, orgId),
            eq(organizationMembers.userId, existingUser.id)
          )
        )
        .limit(1);

      if (existingMember) {
        return NextResponse.json(
          { error: "Bereits Mitglied dieser Organisation" },
          { status: 409 }
        );
      }

      // Add existing user directly to org
      const [member] = await db
        .insert(organizationMembers)
        .values({ organizationId: orgId, userId: existingUser.id, role })
        .returning();

      // Send a notification email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
      await sendTeamInviteEmail(
        inviter?.name ?? session.user.email ?? "Jemand",
        org?.name ?? "Zentory",
        email,
        `${appUrl}/dashboard`,
      ).catch((err) => {
        // Non-fatal: log but don't fail the request
        console.error("Failed to send invite email:", err);
        Sentry.captureException(err, { tags: { route: "/api/organizations/[id]/invite" } });
      });

      return NextResponse.json(
        { member, invited: false },
        { status: 201 }
      );
    }

    // User does not exist — send a signup invite email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
    const signupUrl = `${appUrl}/signup?email=${encodeURIComponent(email)}`;
    await sendTeamInviteEmail(
      inviter?.name ?? session.user.email ?? "Jemand",
      org?.name ?? "Zentory",
      email,
      signupUrl,
    ).catch((err) => {
      console.error("Failed to send invite email:", err);
      Sentry.captureException(err, { tags: { route: "/api/organizations/[id]/invite" } });
    });

    return NextResponse.json(
      { invited: true, email },
      { status: 202 }
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "/api/organizations/[id]/invite" },
    });
    console.error("POST /api/organizations/[id]/invite error:", error);
    return NextResponse.json(
      { error: "Einladung konnte nicht gesendet werden" },
      { status: 500 }
    );
  }
}
