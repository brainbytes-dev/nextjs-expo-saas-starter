import { NextResponse } from "next/server";
import { getSessionAndOrg } from "@/app/api/_helpers/auth";
import { organizations } from "@repo/db/schema";
import { eq } from "drizzle-orm";

const VALID_TYPES = ["bug", "feature", "question"] as const;
type IssueType = (typeof VALID_TYPES)[number];

const VALID_PRIORITIES = ["low", "normal", "high", "critical"] as const;
type Priority = (typeof VALID_PRIORITIES)[number];

const TYPE_LABELS: Record<IssueType, string[]> = {
  bug: ["bug", "user-reported"],
  feature: ["enhancement", "user-reported"],
  question: ["question", "user-reported"],
};

const TYPE_EMOJI: Record<IssueType, string> = {
  bug: "\uD83D\uDC1B",
  feature: "\u2728",
  question: "\u2753",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Niedrig",
  normal: "Normal",
  high: "Hoch",
  critical: "Kritisch",
};

export async function POST(request: Request) {
  const result = await getSessionAndOrg(request);
  if ("error" in result && result.error instanceof Response) {
    return result.error;
  }
  const { session, orgId, db } = result as Exclude<typeof result, { error: Response }>;

  let body: {
    type?: string;
    title?: string;
    description?: string;
    priority?: string;
    page?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { type, title, description, priority, page } = body;

  // Validate required fields
  if (!type || !VALID_TYPES.includes(type as IssueType)) {
    return NextResponse.json(
      { error: "Invalid type. Must be bug, feature, or question." },
      { status: 400 }
    );
  }
  if (!title || title.trim().length === 0) {
    return NextResponse.json(
      { error: "Title is required." },
      { status: 400 }
    );
  }
  if (!description || description.trim().length === 0) {
    return NextResponse.json(
      { error: "Description is required." },
      { status: 400 }
    );
  }
  if (priority && !VALID_PRIORITIES.includes(priority as Priority)) {
    return NextResponse.json(
      { error: "Invalid priority." },
      { status: 400 }
    );
  }

  const issueType = type as IssueType;
  const issuePriority = (priority as Priority) || "normal";

  // Fetch org name for context
  let orgName = "Unknown";
  try {
    if (orgId) {
      const [org] = await db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
      if (org) orgName = org.name;
    }
  } catch {
    // non-critical, continue
  }

  // Build GitHub issue body
  const emoji = TYPE_EMOJI[issueType];
  const issueTitle = `${emoji} [${issueType.toUpperCase()}] ${title.trim()}`;
  const issueBody = [
    `## ${issueType === "bug" ? "Bug Report" : issueType === "feature" ? "Feature Request" : "Question"}`,
    "",
    description.trim(),
    "",
    "---",
    "",
    "| Detail | Value |",
    "| --- | --- |",
    `| **Type** | ${issueType} |`,
    `| **Priority** | ${PRIORITY_LABELS[issuePriority]} |`,
    `| **User** | ${session.user.email || "Unknown"} |`,
    `| **Organization** | ${orgName} |`,
    ...(page ? [`| **Page** | \`${page}\` |`] : []),
    `| **Date** | ${new Date().toISOString()} |`,
    "",
    "_This issue was automatically created via the Zentory support form._",
  ].join("\n");

  const githubToken = process.env.GITHUB_ISSUES_TOKEN;
  const repoOwner = process.env.GITHUB_REPO_OWNER || "brainbytes-dev";
  const repoName = process.env.GITHUB_REPO_NAME || "lager-app";

  // If no GitHub token, gracefully degrade — log and return success
  if (!githubToken) {
    console.log("[Support] No GITHUB_ISSUES_TOKEN set. Logging feedback:");
    console.log("[Support]", { type: issueType, title: title.trim(), priority: issuePriority, user: session.user.email });
    return NextResponse.json({ success: true, issueNumber: null });
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: issueTitle,
          body: issueBody,
          labels: TYPE_LABELS[issueType],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Support] GitHub API error:", response.status, errorText);
      // Still return success to user — don't expose GitHub errors
      return NextResponse.json({ success: true, issueNumber: null });
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      issueNumber: data.number ?? null,
    });
  } catch (error) {
    console.error("[Support] Failed to create GitHub issue:", error);
    // Graceful degradation — still return success
    return NextResponse.json({ success: true, issueNumber: null });
  }
}
