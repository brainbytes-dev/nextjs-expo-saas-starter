/**
 * Cleanup script — removes template admin accounts left over from the starter template.
 *
 * Targets:
 *   - admin@proflowlabsai.com
 *   - proflowlabsai@gmail.com
 *
 * Deletes related rows in: organization_members, sessions, accounts, then users.
 * (Most FKs have ON DELETE CASCADE, but we delete explicitly to log each step.)
 *
 * Usage:
 *   npx tsx packages/db/scripts/cleanup-template-accounts.ts
 */

import postgres from "postgres";
import * as dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from repo root
dotenv.config({ path: resolve(__dirname, "../../../.env.local") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set. Check .env.local");
  process.exit(1);
}

const TEMPLATE_EMAILS = [
  "admin@proflowlabsai.com",
  "proflowlabsai@gmail.com",
];

async function main() {
  const sql = postgres(DATABASE_URL!, { max: 1 });

  try {
    console.log("Connecting to database...");
    console.log(`Looking for template accounts: ${TEMPLATE_EMAILS.join(", ")}\n`);

    // Find matching users
    const users = await sql`
      SELECT id, email, name, role, created_at
      FROM users
      WHERE email = ANY(${TEMPLATE_EMAILS})
    `;

    if (users.length === 0) {
      console.log("No template accounts found. Nothing to clean up.");
      return;
    }

    console.log(`Found ${users.length} template account(s):`);
    for (const u of users) {
      console.log(`  - ${u.email} (id: ${u.id}, role: ${u.role}, created: ${u.created_at})`);
    }
    console.log();

    const userIds = users.map((u) => u.id);

    // Delete organization_members
    const orgMembers = await sql`
      DELETE FROM organization_members
      WHERE user_id = ANY(${userIds})
      RETURNING id, organization_id, user_id
    `;
    console.log(`Deleted ${orgMembers.length} organization_members row(s)`);

    // Delete sessions
    const sessionsDeleted = await sql`
      DELETE FROM sessions
      WHERE user_id = ANY(${userIds})
      RETURNING id
    `;
    console.log(`Deleted ${sessionsDeleted.length} sessions row(s)`);

    // Delete accounts
    const accountsDeleted = await sql`
      DELETE FROM accounts
      WHERE user_id = ANY(${userIds})
      RETURNING id, provider_id
    `;
    console.log(`Deleted ${accountsDeleted.length} accounts row(s)`);

    // Delete users
    const usersDeleted = await sql`
      DELETE FROM users
      WHERE id = ANY(${userIds})
      RETURNING id, email
    `;
    console.log(`Deleted ${usersDeleted.length} user(s)`);
    for (const u of usersDeleted) {
      console.log(`  - ${u.email} (${u.id})`);
    }

    console.log("\nCleanup complete.");
  } catch (err) {
    console.error("Error during cleanup:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
