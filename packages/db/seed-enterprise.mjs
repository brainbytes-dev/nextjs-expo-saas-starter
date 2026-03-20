/**
 * Seed demo data for Enterprise features into Supabase.
 * Run: node packages/db/seed-enterprise.mjs
 */
import postgres from "postgres";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const dbUrl = envContent.split("\n").find((l) => l.startsWith("DATABASE_URL="))?.replace("DATABASE_URL=", "").trim();
if (!dbUrl) { console.error("DATABASE_URL not found"); process.exit(1); }

const sql = postgres(dbUrl);
const orgId = "c1e855ab-f700-4000-a23a-998081396430"; // Muster Bau AG
const userId = "03497b19-d99f-4e2b-8641-da9e43a09767"; // Max Muster

async function main() {
  const suppliers = await sql`SELECT id, name FROM suppliers WHERE organization_id = ${orgId} LIMIT 4`;
  const materials = await sql`SELECT id, name FROM materials WHERE organization_id = ${orgId} LIMIT 5`;

  // ─── 1. Plugins (3 built-in) ──────────────────────────────
  const existingPlugins = await sql`SELECT count(*) as c FROM plugins`;
  if (Number(existingPlugins[0].c) === 0) {
    await sql`INSERT INTO plugins (slug, name, description, version, author, icon, category, events, is_builtin, is_published) VALUES
      ('csv-import-pro', 'CSV Import Pro', 'Erweiterte CSV/Excel Import-Funktionen mit Vorlagen und Validierung', '1.2.0', 'LogistikApp', 'IconUpload', 'import', '["material.created"]', true, true),
      ('barcode-label-designer', 'Barcode-Etiketten Designer', 'Drag-Drop Editor für Barcode- und QR-Code-Etiketten', '1.0.0', 'LogistikApp', 'IconBarcode', 'utility', '["material.created", "tool.booked"]', true, true),
      ('slack-notifications', 'Slack Benachrichtigungen', 'Automatische Benachrichtigungen in Slack bei Bestandsänderungen und Kommissionen', '1.1.0', 'LogistikApp', 'IconBrandSlack', 'integration', '["stock.changed", "commission.completed"]', true, true)`;

    // Install 2 plugins for demo org
    const pluginRows = await sql`SELECT id, slug FROM plugins`;
    for (const p of pluginRows) {
      if (p.slug === 'csv-import-pro' || p.slug === 'slack-notifications') {
        await sql`INSERT INTO plugin_installations (organization_id, plugin_id, config, enabled, installed_by)
          VALUES (${orgId}, ${p.id}, ${p.slug === 'slack-notifications' ? '{"webhookUrl": "https://hooks.slack.com/services/DEMO/DEMO/demo"}' : '{}'}, true, ${userId})`;
      }
    }
    console.log("✓ 3 plugins + 2 installations created");
  } else {
    console.log("  (plugins already exist)");
  }

  // ─── 2. Recurring Orders ──────────────────────────────────
  const existingRO = await sql`SELECT count(*) as c FROM recurring_orders WHERE organization_id = ${orgId}`;
  if (Number(existingRO[0].c) === 0 && suppliers.length > 0 && materials.length > 0) {
    const roData = [
      {
        name: "Wöchentliche Schrauben-Nachbestellung",
        supplierId: suppliers[0].id,
        items: JSON.stringify([{ materialId: materials[0].id, materialName: materials[0].name, quantity: 100 }]),
        frequency: "weekly",
        dayOfWeek: 1, // Montag
        nextRun: new Date(2026, 2, 24).toISOString(), // nächster Montag
      },
      {
        name: "Monatliche Büromaterial-Bestellung",
        supplierId: suppliers.length > 1 ? suppliers[1].id : suppliers[0].id,
        items: JSON.stringify([
          { materialId: materials[1]?.id || materials[0].id, materialName: materials[1]?.name || materials[0].name, quantity: 50 },
          { materialId: materials[2]?.id || materials[0].id, materialName: materials[2]?.name || materials[0].name, quantity: 20 },
        ]),
        frequency: "monthly",
        dayOfMonth: 1,
        nextRun: new Date(2026, 3, 1).toISOString(),
      },
      {
        name: "2-wöchentliche Reinigungsmittel",
        supplierId: suppliers.length > 2 ? suppliers[2].id : suppliers[0].id,
        items: JSON.stringify([{ materialId: materials[3]?.id || materials[0].id, materialName: materials[3]?.name || materials[0].name, quantity: 30 }]),
        frequency: "biweekly",
        dayOfWeek: 3, // Mittwoch
        nextRun: new Date(2026, 2, 26).toISOString(),
      },
    ];
    for (const ro of roData) {
      await sql`INSERT INTO recurring_orders (organization_id, supplier_id, name, items, frequency, day_of_week, day_of_month, next_run_at, is_active, created_by_id)
        VALUES (${orgId}, ${ro.supplierId}, ${ro.name}, ${ro.items}, ${ro.frequency}, ${ro.dayOfWeek || null}, ${ro.dayOfMonth || null}, ${ro.nextRun}, true, ${userId})`;
    }
    console.log("✓ 3 recurring orders created");
  } else {
    console.log("  (recurring orders already exist)");
  }

  // ─── 3. Label Templates ───────────────────────────────────
  const existingLT = await sql`SELECT count(*) as c FROM label_templates WHERE organization_id = ${orgId}`;
  if (Number(existingLT[0].c) === 0) {
    const templates = [
      {
        name: "Standard Material-Etikett",
        width: 100, height: 50,
        elements: JSON.stringify([
          { type: "text", x: 5, y: 5, width: 90, height: 12, content: "", dataBinding: "materialName", fontSize: 14, fontWeight: "bold" },
          { type: "text", x: 5, y: 20, width: 40, height: 10, content: "", dataBinding: "materialNumber", fontSize: 10 },
          { type: "barcode", x: 5, y: 32, width: 60, height: 15, content: "", dataBinding: "barcode", barcodeFormat: "code128" },
          { type: "text", x: 70, y: 20, width: 25, height: 10, content: "", dataBinding: "orgName", fontSize: 8 },
        ]),
      },
      {
        name: "Werkzeug QR-Etikett",
        width: 50, height: 25,
        elements: JSON.stringify([
          { type: "qrcode", x: 2, y: 2, width: 21, height: 21, content: "", dataBinding: "barcode" },
          { type: "text", x: 25, y: 3, width: 23, height: 8, content: "", dataBinding: "toolName", fontSize: 8, fontWeight: "bold" },
          { type: "text", x: 25, y: 12, width: 23, height: 6, content: "", dataBinding: "toolNumber", fontSize: 7 },
        ]),
      },
      {
        name: "Versandetikett gross",
        width: 100, height: 150,
        elements: JSON.stringify([
          { type: "text", x: 5, y: 5, width: 90, height: 14, content: "", dataBinding: "orgName", fontSize: 16, fontWeight: "bold" },
          { type: "line", x: 5, y: 22, width: 90, height: 1 },
          { type: "text", x: 5, y: 28, width: 90, height: 12, content: "", dataBinding: "materialName", fontSize: 14 },
          { type: "barcode", x: 10, y: 50, width: 80, height: 30, content: "", dataBinding: "barcode", barcodeFormat: "code128" },
          { type: "qrcode", x: 30, y: 90, width: 40, height: 40, content: "", dataBinding: "barcode" },
          { type: "text", x: 5, y: 135, width: 90, height: 10, content: "", dataBinding: "date", fontSize: 9 },
        ]),
      },
    ];
    for (const t of templates) {
      await sql`INSERT INTO label_templates (organization_id, name, width, height, elements)
        VALUES (${orgId}, ${t.name}, ${t.width}, ${t.height}, ${t.elements})`;
    }
    console.log("✓ 3 label templates created");
  } else {
    console.log("  (label templates already exist)");
  }

  // ─── 4. Org Settings (Data Retention + IP Allowlist) ──────
  const existingOS = await sql`SELECT count(*) as c FROM org_settings WHERE organization_id = ${orgId}`;
  if (Number(existingOS[0].c) === 0) {
    await sql`INSERT INTO org_settings (organization_id, key, value) VALUES
      (${orgId}, 'data_retention', '{"stockChangesMonths": 24, "toolBookingsMonths": 24, "auditLogMonths": 12, "commentsMonths": 36, "autoCleanup": false}'),
      (${orgId}, 'ip_allowlist', '[]')`;
    console.log("✓ 2 org settings created");
  } else {
    console.log("  (org settings already exist)");
  }

  // ─── 5. Update org with Enterprise plan + all features ────
  await sql`UPDATE organizations SET
    plan_override = 'enterprise',
    enabled_features = ${JSON.stringify([
      "materials", "tools", "keys", "commissions", "barcode_scanner", "locations", "users_5",
      "time_tracking", "delivery_tracking", "warranty_claims", "stock_optimization", "portals",
      "budgets", "transfers", "reports", "calendar", "locations_unlimited", "users_25",
      "rfid", "workflow_engine", "api_webhooks", "custom_branding", "sso", "multi_company",
      "approval_workflows", "users_unlimited", "label_printer", "floor_plan",
      "maintenance_ai", "supply_chain", "label_designer", "email_parser", "two_factor",
      "ip_allowlist", "data_retention", "plugins", "voice_assistant", "batch_print",
      "white_label", "recurring_orders", "commission_kanban", "shift_handover",
      "photo_gallery", "qr_locations", "offline_maps", "migration"
    ])}
    WHERE id = ${orgId}`;
  console.log("✓ Demo org set to Enterprise with all features enabled");

  // ─── Summary ──────────────────────────────────────────────
  const counts = await sql`
    SELECT
      (SELECT count(*) FROM plugins) as plugins,
      (SELECT count(*) FROM plugin_installations WHERE organization_id = ${orgId}) as installed_plugins,
      (SELECT count(*) FROM recurring_orders WHERE organization_id = ${orgId}) as recurring_orders,
      (SELECT count(*) FROM label_templates WHERE organization_id = ${orgId}) as label_templates,
      (SELECT count(*) FROM org_settings WHERE organization_id = ${orgId}) as org_settings,
      (SELECT count(*) FROM orders WHERE organization_id = ${orgId}) as orders,
      (SELECT count(*) FROM delivery_tracking WHERE organization_id = ${orgId}) as deliveries,
      (SELECT count(*) FROM budgets WHERE organization_id = ${orgId}) as budgets,
      (SELECT count(*) FROM transfer_orders WHERE organization_id = ${orgId}) as transfers,
      (SELECT count(*) FROM warranty_claims WHERE organization_id = ${orgId}) as warranty_claims,
      (SELECT count(*) FROM time_entries WHERE organization_id = ${orgId}) as time_entries,
      (SELECT count(*) FROM stock_auto_adjust_settings WHERE organization_id = ${orgId}) as auto_adjust,
      (SELECT count(*) FROM vendor_portal_tokens WHERE organization_id = ${orgId}) as vendor_tokens,
      (SELECT count(*) FROM customer_portal_tokens WHERE organization_id = ${orgId}) as customer_tokens,
      (SELECT count(*) FROM geofences WHERE organization_id = ${orgId}) as geofences
  `;
  console.log("\n═══ FULL DEMO DATA SUMMARY (Muster Bau AG) ═══");
  Object.entries(counts[0]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  await sql.end();
  console.log("\nDone! 🎉");
}

main().catch((err) => { console.error(err); process.exit(1); });
