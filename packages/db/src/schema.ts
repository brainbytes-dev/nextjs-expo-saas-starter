import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  boolean,
  jsonb,
  uniqueIndex,
  index,
  integer,
  date,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─── Users ──────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  name: text("name"),
  image: text("image"),
  role: text("role").default("user").notNull(), // user, admin
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Better-Auth: Sessions ──────────────────────────────────────────
export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Better-Auth: Accounts ──────────────────────────────────────────
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Better-Auth: Verifications ─────────────────────────────────────
export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── User Subscriptions (Stripe) ────────────────────────────────────
export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull().unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    email: text("email"),
    status: text("status").default("inactive").notNull(),
    planId: text("plan_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    canceledAt: timestamp("canceled_at"),
  },
  (table) => [
    index("idx_user_subscriptions_status").on(table.status),
    index("idx_user_subscriptions_user_id").on(table.userId),
  ]
);

// ─── Payments (Stripe) ─────────────────────────────────────────────
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    stripeInvoiceId: text("stripe_invoice_id").notNull().unique(),
    stripeSubscriptionId: text("stripe_subscription_id").references(
      () => userSubscriptions.stripeSubscriptionId
    ),
    amount: bigint("amount", { mode: "number" }),
    currency: text("currency").default("usd"),
    status: text("status").default("pending").notNull(),
    paidAt: timestamp("paid_at"),
    failedAt: timestamp("failed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_payments_subscription").on(table.stripeSubscriptionId),
    index("idx_payments_status").on(table.status),
    index("idx_payments_user_id").on(table.userId),
  ]
);

// ─── Mobile Subscriptions (RevenueCat) ──────────────────────────────
export const mobileSubscriptions = pgTable(
  "mobile_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    revenuecatUserId: text("revenuecat_user_id").notNull().unique(),
    productId: text("product_id").notNull(),
    store: text("store").default("apple"), // apple, google, stripe
    status: text("status").default("active").notNull(),
    autoResumeDate: timestamp("auto_resume_date"),
    expirationDate: timestamp("expiration_date"),
    purchaseDate: timestamp("purchase_date"),
    canceledAt: timestamp("canceled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_mobile_subscriptions_status").on(table.status),
    index("idx_mobile_subscriptions_store").on(table.store),
  ]
);

// ─── Mobile Payments (RevenueCat) ───────────────────────────────────
export const mobilePayments = pgTable(
  "mobile_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    revenuecatUserId: text("revenuecat_user_id")
      .notNull()
      .references(() => mobileSubscriptions.revenuecatUserId),
    transactionId: text("transaction_id").unique(),
    productId: text("product_id").notNull(),
    amount: bigint("amount", { mode: "number" }),
    currency: text("currency").default("usd"),
    store: text("store"),
    status: text("status").default("completed").notNull(),
    receiptData: jsonb("receipt_data"),
    purchasedAt: timestamp("purchased_at"),
    failedAt: timestamp("failed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_mobile_payments_subscription").on(table.revenuecatUserId),
    index("idx_mobile_payments_status").on(table.status),
  ]
);

// ═════════════════════════════════════════════════════════════════════
// Zentory Business Domain Tables
// ═════════════════════════════════════════════════════════════════════

// ─── Organizations (Multi-Tenancy) ──────────────────────────────────
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  industry: text("industry"), // "handwerk", "rettungsdienst", "arztpraxis", "spital"
  address: text("address"),
  zip: text("zip"),
  city: text("city"),
  country: text("country").default("CH"),
  currency: text("currency").default("CHF"),
  logo: text("logo"),
  primaryColor: text("primary_color"),
  accentColor: text("accent_color"),
  aiSettings: jsonb("ai_settings"), // { openaiApiKey?: string }
  enabledFeatures: jsonb("enabled_features"), // string[] — Enterprise: individually managed feature IDs
  planOverride: text("plan_override"), // "starter" | "professional" | "enterprise" — admin override
  adminNotes: text("admin_notes"), // internal notes (only visible in admin panel)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ─── Organization Members ───────────────────────────────────────────
export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").default("member"), // "owner", "admin", "member"
    rbacRoleId: uuid("rbac_role_id"), // FK to roles.id — deferred to avoid forward-ref (see roles table below)
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_org_members_org_id").on(table.organizationId),
    index("idx_org_members_user_id").on(table.userId),
    uniqueIndex("idx_org_members_org_user").on(
      table.organizationId,
      table.userId
    ),
    index("idx_org_members_rbac_role_id").on(table.rbacRoleId),
  ]
);

// ─── Locations (Lagerorte) ──────────────────────────────────────────
export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull(), // "warehouse", "vehicle", "site", "station", "practice", "operating_room", "user"
    category: text("category"),
    template: text("template"),
    address: text("address"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    metadata: jsonb("metadata"), // Vehicle-specific data, custom fields, etc.
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_locations_org_id").on(table.organizationId),
    index("idx_locations_type").on(table.type),
  ]
);

// ─── Material Groups ────────────────────────────────────────────────
export const materialGroups = pgTable(
  "material_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    defaultNumber: text("default_number"),
    defaultName: text("default_name"),
    defaultLocation: text("default_location"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_material_groups_org_id").on(table.organizationId)]
);

// ─── Tool Groups ────────────────────────────────────────────────────
export const toolGroups = pgTable(
  "tool_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    returnChecklist: jsonb("return_checklist"), // checklist items array
    pickupChecklist: jsonb("pickup_checklist"), // checklist items array
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_tool_groups_org_id").on(table.organizationId)]
);

// ─── Suppliers (Lieferanten) ────────────────────────────────────────
export const suppliers = pgTable(
  "suppliers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    supplierNumber: text("supplier_number"),
    customerNumber: text("customer_number"), // our number at supplier
    contactPerson: text("contact_person"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    zip: text("zip"),
    city: text("city"),
    country: text("country"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_suppliers_org_id").on(table.organizationId)]
);

// ─── Customers (Kunden) ─────────────────────────────────────────────
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    customerNumber: text("customer_number"),
    contactPerson: text("contact_person"),
    email: text("email"),
    phone: text("phone"),
    street: text("street"),
    zip: text("zip"),
    city: text("city"),
    country: text("country"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_customers_org_id").on(table.organizationId)]
);

// ─── Projects (Projekte) ────────────────────────────────────────────
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    customerId: uuid("customer_id").references(() => customers.id),
    startDate: date("start_date"),
    endDate: date("end_date"),
    projectLeader: text("project_leader"),
    costCenter: text("cost_center"),
    projectNumber: text("project_number"),
    isArchived: boolean("is_archived").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_projects_org_id").on(table.organizationId)]
);

// ─── Materials (Materialien/Verbrauchsmaterial) ─────────────────────
export const materials = pgTable(
  "materials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: text("number"),
    name: text("name").notNull(),
    groupId: uuid("group_id").references(() => materialGroups.id),
    mainLocationId: uuid("main_location_id").references(() => locations.id),
    unit: text("unit").default("Stk"),
    barcode: text("barcode"),
    image: text("image"),
    manufacturer: text("manufacturer"),
    manufacturerNumber: text("manufacturer_number"),
    reorderLevel: integer("reorder_level").default(0), // Meldebestand
    notes: text("notes"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_materials_org_id").on(table.organizationId),
    index("idx_materials_group_id").on(table.groupId),
    index("idx_materials_barcode").on(table.barcode),
  ]
);

// ─── Tools (Werkzeuge/Geräte) ───────────────────────────────────────
export const tools = pgTable(
  "tools",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: text("number"),
    name: text("name").notNull(),
    groupId: uuid("group_id").references(() => toolGroups.id),
    homeLocationId: uuid("home_location_id").references(() => locations.id), // Zuhause
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    assignedLocationId: uuid("assigned_location_id").references(
      () => locations.id
    ),
    barcode: text("barcode"),
    image: text("image"),
    manufacturer: text("manufacturer"),
    manufacturerNumber: text("manufacturer_number"),
    serialNumber: text("serial_number"),
    condition: text("condition").default("good"), // "good", "damaged", "repair", "decommissioned"
    maintenanceIntervalDays: integer("maintenance_interval_days"),
    lastMaintenanceDate: date("last_maintenance_date"),
    nextMaintenanceDate: date("next_maintenance_date"),
    notes: text("notes"),
    purchasePrice: integer("purchase_price"), // in cents
    purchaseDate: date("purchase_date"),
    expectedLifeYears: integer("expected_life_years"),
    salvageValue: integer("salvage_value"), // in cents
    depreciationMethod: text("depreciation_method"), // "linear" | "declining"
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_tools_org_id").on(table.organizationId),
    index("idx_tools_group_id").on(table.groupId),
    index("idx_tools_assigned_to_id").on(table.assignedToId),
    index("idx_tools_barcode").on(table.barcode),
  ]
);

// ─── Keys (Schlüssel) ───────────────────────────────────────────────
export const keys = pgTable(
  "keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    number: text("number"),
    name: text("name").notNull(),
    address: text("address"), // what the key is for
    quantity: integer("quantity").default(1),
    homeLocationId: uuid("home_location_id").references(() => locations.id),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    barcode: text("barcode"),
    image: text("image"),
    notes: text("notes"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_keys_org_id").on(table.organizationId)]
);

// ─── Material Stocks (Bestand pro Lagerort) ─────────────────────────
export const materialStocks = pgTable(
  "material_stocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    quantity: integer("quantity").default(0).notNull(),
    batchNumber: text("batch_number"), // Chargennummer
    serialNumber: text("serial_number"), // Seriennummer
    expiryDate: date("expiry_date"), // Ablaufdatum (critical for medical)
    minStock: integer("min_stock"), // location-specific min
    maxStock: integer("max_stock"), // location-specific max
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_material_stocks_material_id").on(table.materialId),
    index("idx_material_stocks_location_id").on(table.locationId),
    index("idx_material_stocks_org_id").on(table.organizationId),
    index("idx_material_stocks_expiry_date").on(table.expiryDate),
  ]
);

// ─── Stock Changes (Bestandsänderungen / Audit Trail) ───────────────
export const stockChanges = pgTable(
  "stock_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    userId: uuid("user_id").references(() => users.id),
    changeType: text("change_type").notNull(), // "in", "out", "transfer", "correction", "inventory"
    quantity: integer("quantity").notNull(), // positive or negative
    previousQuantity: integer("previous_quantity"),
    newQuantity: integer("new_quantity"),
    batchNumber: text("batch_number"),
    serialNumber: text("serial_number"),
    targetLocationId: uuid("target_location_id").references(() => locations.id),
    commissionId: uuid("commission_id"), // FK added later to avoid circular ref
    orderId: uuid("order_id"), // FK added later
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }), // Kostenstelle / Projekt
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_stock_changes_org_id").on(table.organizationId),
    index("idx_stock_changes_material_id").on(table.materialId),
    index("idx_stock_changes_location_id").on(table.locationId),
    index("idx_stock_changes_created_at").on(table.createdAt),
    index("idx_stock_changes_change_type").on(table.changeType),
    index("idx_stock_changes_project_id").on(table.projectId),
  ]
);

// ─── Tool Bookings (Werkzeug Ein-/Ausbuchungen) ────────────────────
export const toolBookings = pgTable(
  "tool_bookings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    fromLocationId: uuid("from_location_id").references(() => locations.id),
    toLocationId: uuid("to_location_id").references(() => locations.id),
    bookingType: text("booking_type").notNull(), // "checkout", "checkin", "transfer"
    notes: text("notes"),
    checklistResult: jsonb("checklist_result"), // [{id, label, checked, notes?}]
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_tool_bookings_org_id").on(table.organizationId),
    index("idx_tool_bookings_tool_id").on(table.toolId),
    index("idx_tool_bookings_user_id").on(table.userId),
    index("idx_tool_bookings_created_at").on(table.createdAt),
  ]
);

// ─── Commissions (Kommissionen) ─────────────────────────────────────
export const commissions = pgTable(
  "commissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    number: integer("number"), // auto-incrementing per org
    manualNumber: text("manual_number"),
    targetLocationId: uuid("target_location_id").references(() => locations.id),
    customerId: uuid("customer_id").references(() => customers.id),
    responsibleId: uuid("responsible_id").references(() => users.id),
    vehicleId: uuid("vehicle_id").references(() => locations.id),
    status: text("status").default("open"), // "open", "in_progress", "completed", "cancelled"
    notes: text("notes"),
    signature: text("signature"),        // base64 PNG data URL — digital signature
    signedAt: timestamp("signed_at"),     // when the signature was captured
    signedBy: text("signed_by"),          // name of the person who signed
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_commissions_org_id").on(table.organizationId),
    index("idx_commissions_status").on(table.status),
  ]
);

// ─── Commission Entries (Kommission Einträge) ───────────────────────
export const commissionEntries = pgTable(
  "commission_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    commissionId: uuid("commission_id")
      .notNull()
      .references(() => commissions.id, { onDelete: "cascade" }),
    materialId: uuid("material_id").references(() => materials.id),
    toolId: uuid("tool_id").references(() => tools.id),
    quantity: integer("quantity").default(1),
    pickedQuantity: integer("picked_quantity").default(0),
    status: text("status").default("open"), // "open", "picked", "completed"
    responsibleId: uuid("responsible_id").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_commission_entries_commission_id").on(table.commissionId),
    index("idx_commission_entries_org_id").on(table.organizationId),
  ]
);

// ─── Orders (Bestellungen) ──────────────────────────────────────────
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    orderNumber: text("order_number"),
    ownOrderNumber: text("own_order_number"),
    status: text("status").default("draft"), // "draft", "ordered", "partial", "received", "cancelled"
    orderDate: date("order_date"),
    totalAmount: bigint("total_amount", { mode: "number" }),
    currency: text("currency").default("CHF"),
    notes: text("notes"),
    documentUrl: text("document_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_orders_org_id").on(table.organizationId),
    index("idx_orders_supplier_id").on(table.supplierId),
    index("idx_orders_status").on(table.status),
  ]
);

// ─── Order Items (Bestellpositionen) ────────────────────────────────
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id),
    quantity: integer("quantity").notNull(),
    receivedQuantity: integer("received_quantity").default(0),
    unitPrice: bigint("unit_price", { mode: "number" }), // in cents
    currency: text("currency").default("CHF"),
    deliveryNoteNumber: text("delivery_note_number"), // Lieferschein
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_order_items_order_id").on(table.orderId),
    index("idx_order_items_material_id").on(table.materialId),
  ]
);

// ─── Tasks (Aufgaben) ───────────────────────────────────────────────
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status").default("open"), // "open", "in_progress", "completed"
    materialId: uuid("material_id").references(() => materials.id),
    toolId: uuid("tool_id").references(() => tools.id),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    dueDate: date("due_date"),
    description: text("description"),
    topic: text("topic"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_tasks_org_id").on(table.organizationId),
    index("idx_tasks_status").on(table.status),
    index("idx_tasks_assigned_to_id").on(table.assignedToId),
  ]
);

// ─── Audit Log (Änderungshistorie) ──────────────────────────────────
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    objectType: text("object_type").notNull(), // "material", "tool", "key", "location", etc.
    objectId: uuid("object_id").notNull(),
    userId: uuid("user_id").references(() => users.id),
    field: text("field"), // which field changed
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_audit_log_org_id").on(table.organizationId),
    index("idx_audit_log_object").on(table.objectType, table.objectId),
    index("idx_audit_log_created_at").on(table.createdAt),
  ]
);

// ─── Custom Field Definitions ───────────────────────────────────────
export const customFieldDefinitions = pgTable(
  "custom_field_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // "material", "tool", "key"
    name: text("name").notNull(),
    fieldType: text("field_type").notNull(), // "text", "number", "date", "select", "boolean"
    options: jsonb("options"), // for select type
    sortOrder: integer("sort_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_custom_field_defs_org_id").on(table.organizationId),
    index("idx_custom_field_defs_entity_type").on(table.entityType),
  ]
);

// ─── Custom Field Values ────────────────────────────────────────────
export const customFieldValues = pgTable(
  "custom_field_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    definitionId: uuid("definition_id")
      .notNull()
      .references(() => customFieldDefinitions.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").notNull(), // the material/tool/key ID
    value: text("value"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_custom_field_values_def_id").on(table.definitionId),
    index("idx_custom_field_values_entity_id").on(table.entityId),
  ]
);


// ─── Inventory Counts (Inventuren) ──────────────────────────────────
export const inventoryCounts = pgTable("inventory_counts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // e.g. "Inventur Q1 2026"
  locationId: uuid("location_id").references(() => locations.id),
  status: text("status").default("draft").notNull(), // draft, in_progress, completed, cancelled
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  completedBy: uuid("completed_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
},
(table) => [
  index("idx_inventory_counts_org_id").on(table.organizationId),
  index("idx_inventory_counts_status").on(table.status),
]);

// ─── Inventory Count Items ───────────────────────────────────────────
export const inventoryCountItems = pgTable("inventory_count_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  countId: uuid("count_id")
    .notNull()
    .references(() => inventoryCounts.id, { onDelete: "cascade" }),
  materialId: uuid("material_id")
    .notNull()
    .references(() => materials.id),
  locationId: uuid("location_id")
    .notNull()
    .references(() => locations.id),
  expectedQuantity: integer("expected_quantity").notNull(),
  countedQuantity: integer("counted_quantity"),
  difference: integer("difference"),
  countedBy: uuid("counted_by").references(() => users.id),
  countedAt: timestamp("counted_at"),
  notes: text("notes"),
},
(table) => [
  index("idx_inventory_count_items_count_id").on(table.countId),
  index("idx_inventory_count_items_material_id").on(table.materialId),
]);

// ─── Type Exports ───────────────────────────────────────────────────
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Verification = typeof verifications.$inferSelect;
export type NewVerification = typeof verifications.$inferInsert;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type MobileSubscription = typeof mobileSubscriptions.$inferSelect;
export type NewMobileSubscription = typeof mobileSubscriptions.$inferInsert;
export type MobilePayment = typeof mobilePayments.$inferSelect;
export type NewMobilePayment = typeof mobilePayments.$inferInsert;

// Zentory Domain Types
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type NewOrganizationMember = typeof organizationMembers.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;
export type MaterialGroup = typeof materialGroups.$inferSelect;
export type NewMaterialGroup = typeof materialGroups.$inferInsert;
export type ToolGroup = typeof toolGroups.$inferSelect;
export type NewToolGroup = typeof toolGroups.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type NewSupplier = typeof suppliers.$inferInsert;
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;
export type Tool = typeof tools.$inferSelect;
export type NewTool = typeof tools.$inferInsert;
export type Key = typeof keys.$inferSelect;
export type NewKey = typeof keys.$inferInsert;
export type MaterialStock = typeof materialStocks.$inferSelect;
export type NewMaterialStock = typeof materialStocks.$inferInsert;
export type StockChange = typeof stockChanges.$inferSelect;
export type NewStockChange = typeof stockChanges.$inferInsert;
export type ToolBooking = typeof toolBookings.$inferSelect;
export type NewToolBooking = typeof toolBookings.$inferInsert;
export type Commission = typeof commissions.$inferSelect;
export type NewCommission = typeof commissions.$inferInsert;
export type CommissionEntry = typeof commissionEntries.$inferSelect;
export type NewCommissionEntry = typeof commissionEntries.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;
export type NewCustomFieldDefinition = typeof customFieldDefinitions.$inferInsert;
export type CustomFieldValue = typeof customFieldValues.$inferSelect;
export type NewCustomFieldValue = typeof customFieldValues.$inferInsert;

// ─── Push Tokens (Mobile Notifications) ─────────────────────────────
export const pushTokens = pgTable(
  "push_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    platform: text("platform").notNull(), // "ios" | "android"
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_push_tokens_user_id").on(table.userId),
    index("idx_push_tokens_is_active").on(table.isActive),
  ]
);

export type PushToken = typeof pushTokens.$inferSelect;
export type NewPushToken = typeof pushTokens.$inferInsert;

// ─── Webhook Subscriptions (Zapier/Make/Custom) ──────────────────────
export const webhookSubscriptions = pgTable(
  "webhook_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secret: text("secret").notNull(), // HMAC-SHA256 signing secret
    events: text("events").array().notNull(), // e.g. ["material.created", "stock.changed"]
    isActive: boolean("is_active").default(true).notNull(),
    lastTriggeredAt: timestamp("last_triggered_at"),
    failCount: integer("fail_count").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_webhook_subscriptions_org_id").on(table.organizationId),
    index("idx_webhook_subscriptions_is_active").on(table.isActive),
  ]
);

export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type NewWebhookSubscription = typeof webhookSubscriptions.$inferInsert;

// ─── EAN / GTIN Lookup Cache ─────────────────────────────────────────
export const eanCache = pgTable("ean_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  barcode: text("barcode").notNull().unique(),
  name: text("name"),
  manufacturer: text("manufacturer"),
  description: text("description"),
  imageUrl: text("image_url"),
  category: text("category"),
  source: text("source").notNull(), // "openfoodfacts" | "opengtindb" | "manual"
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EanCacheEntry = typeof eanCache.$inferSelect;
export type NewEanCacheEntry = typeof eanCache.$inferInsert;

// ─── Alert Settings (Benachrichtigungseinstellungen) ─────────────────
export const alertSettings = pgTable("alert_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" })
    .unique(),
  whatsappPhone: text("whatsapp_phone"),
  emailAlerts: boolean("email_alerts").default(true).notNull(),
  whatsappAlerts: boolean("whatsapp_alerts").default(false).notNull(),
  lowStockThreshold: integer("low_stock_threshold").default(1).notNull(),
  maintenanceAlertDays: integer("maintenance_alert_days").default(7).notNull(),
  autoReorder: boolean("auto_reorder").default(false).notNull(),
  reorderTargetMultiplier: integer("reorder_target_multiplier").default(2).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AlertSettings = typeof alertSettings.$inferSelect;
export type NewAlertSettings = typeof alertSettings.$inferInsert;

// ─── Maintenance Events (Wartungshistorie) ───────────────────────────
export const maintenanceEvents = pgTable(
  "maintenance_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    performedById: uuid("performed_by_id").references(() => users.id),
    performedAt: timestamp("performed_at").defaultNow().notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_maintenance_events_org_id").on(table.organizationId),
    index("idx_maintenance_events_tool_id").on(table.toolId),
    index("idx_maintenance_events_performed_at").on(table.performedAt),
  ]
);

export type MaintenanceEvent = typeof maintenanceEvents.$inferSelect;
export type NewMaintenanceEvent = typeof maintenanceEvents.$inferInsert;
export type InventoryCount = typeof inventoryCounts.$inferSelect;
export type NewInventoryCount = typeof inventoryCounts.$inferInsert;
export type InventoryCountItem = typeof inventoryCountItems.$inferSelect;
export type NewInventoryCountItem = typeof inventoryCountItems.$inferInsert;

// ─── SSO Configurations (Enterprise SSO/SAML) ────────────────────────
export const ssoConfigs = pgTable("sso_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" })
    .unique(),
  provider: text("provider").notNull(), // "azure_ad" | "google_workspace" | "okta" | "custom_oidc"
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  issuerUrl: text("issuer_url"),
  domain: text("domain"), // auto-assign users with this email domain
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SsoConfig = typeof ssoConfigs.$inferSelect;
export type NewSsoConfig = typeof ssoConfigs.$inferInsert;

// ─── Integration Tokens (ERP/Buchhaltungs-Integrationen) ─────────────────────
export const integrationTokens = pgTable(
  "integration_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // "bexio" | "abacus" | "vertec"
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at"),
    scope: text("scope"),
    metadata: jsonb("metadata"),
    // Sync state
    lastSyncAt: timestamp("last_sync_at"),
    lastSyncResult: jsonb("last_sync_result"), // { created, updated, skipped, errors }
    syncDirection: text("sync_direction").default("both"), // "import" | "export" | "both"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_integration_tokens_org_provider").on(
      table.organizationId,
      table.provider
    ),
    index("idx_integration_tokens_org_id").on(table.organizationId),
    index("idx_integration_tokens_provider").on(table.provider),
  ]
);

export type IntegrationToken = typeof integrationTokens.$inferSelect;
export type NewIntegrationToken = typeof integrationTokens.$inferInsert;

// ═════════════════════════════════════════════════════════════════════
// Ultimate Edition — New Tables
// ═════════════════════════════════════════════════════════════════════

// ─── Attachments ─────────────────────────────────────────────────────
export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // "material" | "tool" | "key" | "commission" | "order" | "location"
    entityId: uuid("entity_id").notNull(),
    fileName: text("file_name").notNull(),
    fileUrl: text("file_url").notNull(),
    fileSize: integer("file_size"),
    mimeType: text("mime_type"),
    uploadedById: uuid("uploaded_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_attachments_org_id").on(table.organizationId),
    index("idx_attachments_entity").on(table.entityType, table.entityId),
    index("idx_attachments_uploaded_by_id").on(table.uploadedById),
  ]
);

// ─── Comments ────────────────────────────────────────────────────────
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    mentions: jsonb("mentions"), // array of user IDs
    parentId: uuid("parent_id"), // self-reference for threads
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_comments_org_id").on(table.organizationId),
    index("idx_comments_entity").on(table.entityType, table.entityId),
    index("idx_comments_user_id").on(table.userId),
    index("idx_comments_parent_id").on(table.parentId),
  ]
);

// ─── RBAC Roles ───────────────────────────────────────────────────────
export const roles = pgTable(
  "roles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_roles_org_id").on(table.organizationId),
    uniqueIndex("idx_roles_org_slug").on(table.organizationId, table.slug),
  ]
);

// ─── RBAC Permissions ────────────────────────────────────────────────
export const permissions = pgTable(
  "permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    resource: text("resource").notNull(), // "materials" | "tools" | "locations" etc.
    action: text("action").notNull(), // "read" | "create" | "update" | "delete"
    allowed: boolean("allowed").default(true).notNull(),
  },
  (table) => [
    index("idx_permissions_role_id").on(table.roleId),
    index("idx_permissions_resource").on(table.resource),
  ]
);

// ─── Supplier Prices ──────────────────────────────────────────────────
export const supplierPrices = pgTable(
  "supplier_prices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    unitPrice: integer("unit_price").notNull(), // in cents
    currency: text("currency").default("CHF"),
    minOrderQuantity: integer("min_order_quantity").default(1),
    leadTimeDays: integer("lead_time_days"),
    validFrom: timestamp("valid_from"),
    validTo: timestamp("valid_to"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_supplier_prices_org_id").on(table.organizationId),
    index("idx_supplier_prices_supplier_id").on(table.supplierId),
    index("idx_supplier_prices_material_id").on(table.materialId),
  ]
);

// ─── Insurance Records ────────────────────────────────────────────────
export const insuranceRecords = pgTable(
  "insurance_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // "tool" | "material" | "vehicle"
    entityId: uuid("entity_id").notNull(),
    provider: text("provider").notNull(),
    policyNumber: text("policy_number"),
    coverageAmount: integer("coverage_amount"), // in cents
    premium: integer("premium"), // in cents
    startDate: date("start_date"),
    endDate: date("end_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_insurance_records_org_id").on(table.organizationId),
    index("idx_insurance_records_entity").on(table.entityType, table.entityId),
  ]
);

// ─── Warranty Records ────────────────────────────────────────────────
export const warrantyRecords = pgTable(
  "warranty_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    provider: text("provider"),
    warrantyStart: date("warranty_start"),
    warrantyEnd: date("warranty_end"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_warranty_records_org_id").on(table.organizationId),
    index("idx_warranty_records_entity").on(table.entityType, table.entityId),
  ]
);

// ─── Scheduled Reports ────────────────────────────────────────────────
export const scheduledReports = pgTable(
  "scheduled_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    reportType: text("report_type").notNull(), // "inventory" | "tools" | "movements" | "commissions"
    schedule: text("schedule").notNull(), // cron expression
    recipients: text("recipients").array().notNull(),
    format: text("format").default("csv").notNull(),
    filters: jsonb("filters"),
    lastSentAt: timestamp("last_sent_at"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_scheduled_reports_org_id").on(table.organizationId),
    index("idx_scheduled_reports_is_active").on(table.isActive),
  ]
);

// ─── Calibration Records ──────────────────────────────────────────────
export const calibrationRecords = pgTable(
  "calibration_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    toolId: uuid("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    calibratedAt: timestamp("calibrated_at").notNull(),
    calibratedById: uuid("calibrated_by_id").references(() => users.id),
    nextCalibrationDate: date("next_calibration_date"),
    certificateUrl: text("certificate_url"),
    result: text("result"), // "pass" | "fail" | "conditional"
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_calibration_records_org_id").on(table.organizationId),
    index("idx_calibration_records_tool_id").on(table.toolId),
    index("idx_calibration_records_calibrated_at").on(table.calibratedAt),
  ]
);

// ─── Approval Requests ────────────────────────────────────────────────
export const approvalRequests = pgTable(
  "approval_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    requestType: text("request_type").notNull(), // "tool_checkout" | "order" | "stock_change"
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id),
    approverId: uuid("approver_id").references(() => users.id),
    status: text("status").default("pending").notNull(), // "pending" | "approved" | "rejected"
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at"),
    notes: text("notes"),
  },
  (table) => [
    index("idx_approval_requests_org_id").on(table.organizationId),
    index("idx_approval_requests_requester_id").on(table.requesterId),
    index("idx_approval_requests_approver_id").on(table.approverId),
    index("idx_approval_requests_status").on(table.status),
    index("idx_approval_requests_entity").on(table.entityType, table.entityId),
  ]
);

// ─── Workflow Rules ───────────────────────────────────────────────────
export const workflowRules = pgTable(
  "workflow_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    triggerEvent: text("trigger_event").notNull(), // "stock.changed" | "tool.checked_out" | etc.
    conditions: jsonb("conditions").notNull(),
    actions: jsonb("actions").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    priority: integer("priority").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_workflow_rules_org_id").on(table.organizationId),
    index("idx_workflow_rules_is_active").on(table.isActive),
    index("idx_workflow_rules_trigger_event").on(table.triggerEvent),
  ]
);

// ─── Industry Templates ───────────────────────────────────────────────
export const industryTemplates = pgTable(
  "industry_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    industry: text("industry").notNull(), // "handwerk" | "rettungsdienst" | "arztpraxis" | "spital"
    name: text("name").notNull(),
    description: text("description"),
    materials: jsonb("materials"), // template material definitions
    tools: jsonb("tools"),
    locations: jsonb("locations"),
    customFields: jsonb("custom_fields"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_industry_templates_industry").on(table.industry),
  ]
);

// ─── Dashboard Widgets ────────────────────────────────────────────────
export const dashboardWidgets = pgTable(
  "dashboard_widgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    widgetType: text("widget_type").notNull(), // "kpi" | "chart" | "table" | "alert" | "activity"
    config: jsonb("config"),
    position: jsonb("position"), // { x, y }
    size: jsonb("size"), // { w, h }
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_dashboard_widgets_org_id").on(table.organizationId),
    index("idx_dashboard_widgets_user_id").on(table.userId),
  ]
);

// ─── API Keys ─────────────────────────────────────────────────────────
export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    prefix: text("prefix").notNull(), // first 8 chars for identification
    scopes: text("scopes").array(),
    lastUsedAt: timestamp("last_used_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_api_keys_org_id").on(table.organizationId),
    uniqueIndex("idx_api_keys_key_hash").on(table.keyHash),
    index("idx_api_keys_prefix").on(table.prefix),
  ]
);

// ─── Floor Plans ──────────────────────────────────────────────────────
export const floorPlans = pgTable(
  "floor_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => locations.id),
    name: text("name").notNull(),
    imageUrl: text("image_url").notNull(),
    items: jsonb("items"), // position markers [{entityType, entityId, x, y, label}]
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_floor_plans_org_id").on(table.organizationId),
    index("idx_floor_plans_location_id").on(table.locationId),
  ]
);

// ─── Ultimate Edition Type Exports ───────────────────────────────────
export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
export type SupplierPrice = typeof supplierPrices.$inferSelect;
export type NewSupplierPrice = typeof supplierPrices.$inferInsert;
export type InsuranceRecord = typeof insuranceRecords.$inferSelect;
export type NewInsuranceRecord = typeof insuranceRecords.$inferInsert;
export type WarrantyRecord = typeof warrantyRecords.$inferSelect;
export type NewWarrantyRecord = typeof warrantyRecords.$inferInsert;
export type ScheduledReport = typeof scheduledReports.$inferSelect;
export type NewScheduledReport = typeof scheduledReports.$inferInsert;
export type CalibrationRecord = typeof calibrationRecords.$inferSelect;
export type NewCalibrationRecord = typeof calibrationRecords.$inferInsert;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;
export type WorkflowRule = typeof workflowRules.$inferSelect;
export type NewWorkflowRule = typeof workflowRules.$inferInsert;
export type IndustryTemplate = typeof industryTemplates.$inferSelect;
export type NewIndustryTemplate = typeof industryTemplates.$inferInsert;
export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type NewDashboardWidget = typeof dashboardWidgets.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type FloorPlan = typeof floorPlans.$inferSelect;
export type NewFloorPlan = typeof floorPlans.$inferInsert;

// ─── Notifications ───────────────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // "low_stock" | "maintenance_due" | "approval_request" | "approval_resolved" | "comment_mention" | "tool_overdue" | "expiry_warning"
    title: text("title").notNull(),
    body: text("body"),
    entityType: text("entity_type"), // "material" | "tool" | "commission" | "approval"
    entityId: uuid("entity_id"),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_notifications_user_id").on(table.userId),
    index("idx_notifications_org_id").on(table.organizationId),
    index("idx_notifications_is_read").on(table.isRead),
    index("idx_notifications_created_at").on(table.createdAt),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// ─── Reservations (Reservierungen) ──────────────────────────────────
export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // "tool" | "material"
    entityId: uuid("entity_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    quantity: integer("quantity").default(1),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    purpose: text("purpose"),
    status: text("status").default("pending").notNull(), // "pending" | "confirmed" | "active" | "completed" | "cancelled"
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_reservations_org_id").on(table.organizationId),
    index("idx_reservations_entity").on(table.entityType, table.entityId),
    index("idx_reservations_user_id").on(table.userId),
    index("idx_reservations_status").on(table.status),
    index("idx_reservations_dates").on(table.startDate, table.endDate),
  ]
);

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;

// ─── Material Requests (Materialanfragen) ────────────────────────────
export const materialRequests = pgTable(
  "material_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id),
    materialId: uuid("material_id").references(() => materials.id),
    materialName: text("material_name").notNull(), // for new items not yet in system
    quantity: integer("quantity").notNull(),
    unit: text("unit").default("Stk"),
    reason: text("reason"),
    priority: text("priority").default("normal"), // "low" | "normal" | "high" | "urgent"
    status: text("status").default("pending").notNull(), // "pending" | "approved" | "rejected" | "ordered" | "delivered"
    approvedById: uuid("approved_by_id").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_material_requests_org_id").on(table.organizationId),
    index("idx_material_requests_requester_id").on(table.requesterId),
    index("idx_material_requests_material_id").on(table.materialId),
    index("idx_material_requests_status").on(table.status),
    index("idx_material_requests_priority").on(table.priority),
  ]
);

export type MaterialRequest = typeof materialRequests.$inferSelect;
export type NewMaterialRequest = typeof materialRequests.$inferInsert;

// ─── Transfer Orders (Umbuchungsaufträge) ────────────────────────────
export const transferOrders = pgTable(
  "transfer_orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    fromLocationId: uuid("from_location_id")
      .notNull()
      .references(() => locations.id),
    toLocationId: uuid("to_location_id")
      .notNull()
      .references(() => locations.id),
    requestedById: uuid("requested_by_id")
      .notNull()
      .references(() => users.id),
    approvedById: uuid("approved_by_id").references(() => users.id),
    status: text("status").default("pending").notNull(), // pending, approved, in_transit, completed, cancelled
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_transfer_orders_org_id").on(table.organizationId),
    index("idx_transfer_orders_status").on(table.status),
    index("idx_transfer_orders_from_location").on(table.fromLocationId),
    index("idx_transfer_orders_to_location").on(table.toLocationId),
  ]
);

// ─── Transfer Order Items ────────────────────────────────────────────
export const transferOrderItems = pgTable(
  "transfer_order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    transferOrderId: uuid("transfer_order_id")
      .notNull()
      .references(() => transferOrders.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id),
    quantity: integer("quantity").notNull(),
    pickedQuantity: integer("picked_quantity").default(0),
  },
  (table) => [
    index("idx_transfer_order_items_transfer_id").on(table.transferOrderId),
    index("idx_transfer_order_items_material_id").on(table.materialId),
  ]
);

export type TransferOrder = typeof transferOrders.$inferSelect;
export type NewTransferOrder = typeof transferOrders.$inferInsert;
export type TransferOrderItem = typeof transferOrderItems.$inferSelect;
export type NewTransferOrderItem = typeof transferOrderItems.$inferInsert;

// ─── Budgets ──────────────────────────────────────────────────────────
export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g. "Q1 2026 Elektro" or "Projekt Oerlikon"
    projectId: uuid("project_id").references(() => projects.id),
    amount: integer("amount").notNull(), // in cents (CHF)
    spent: integer("spent").default(0).notNull(), // calculated from stock_changes
    period: text("period"), // "monthly" | "quarterly" | "yearly" | "project"
    startDate: date("start_date"),
    endDate: date("end_date"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_budgets_org_id").on(table.organizationId),
    index("idx_budgets_project_id").on(table.projectId),
  ]
);

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;

// ─── Supplier Ratings (Lieferantenbewertungen) ───────────────────────
export const supplierRatings = pgTable(
  "supplier_ratings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id),
    deliveryTime: integer("delivery_time"), // actual days
    quality: integer("quality"), // 1-5 stars
    priceAccuracy: integer("price_accuracy"), // 1-5
    communication: integer("communication"), // 1-5
    notes: text("notes"),
    ratedById: uuid("rated_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_supplier_ratings_org_id").on(table.organizationId),
    index("idx_supplier_ratings_supplier_id").on(table.supplierId),
    index("idx_supplier_ratings_rated_by_id").on(table.ratedById),
  ]
);

export type SupplierRating = typeof supplierRatings.$inferSelect;
export type NewSupplierRating = typeof supplierRatings.$inferInsert;

// ─── Time Entries (Zeiterfassung) ────────────────────────────────────
export const timeEntries = pgTable(
  "time_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    commissionId: uuid("commission_id").references(() => commissions.id),
    projectId: uuid("project_id").references(() => projects.id),
    description: text("description"),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time"),
    durationMinutes: integer("duration_minutes"), // calculated or manual
    billable: boolean("billable").default(true),
    hourlyRate: integer("hourly_rate"), // in cents (CHF)
    status: text("status").default("running").notNull(), // running, stopped, approved, rejected
    approvedById: uuid("approved_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_time_entries_org_id").on(table.organizationId),
    index("idx_time_entries_user_id").on(table.userId),
    index("idx_time_entries_commission_id").on(table.commissionId),
    index("idx_time_entries_project_id").on(table.projectId),
    index("idx_time_entries_start_time").on(table.startTime),
    index("idx_time_entries_status").on(table.status),
  ]
);

export type TimeEntry = typeof timeEntries.$inferSelect;
export type NewTimeEntry = typeof timeEntries.$inferInsert;

// ─── Delivery Tracking (Lieferverfolgung) ────────────────────────────
export const deliveryTracking = pgTable(
  "delivery_tracking",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id").references(() => suppliers.id),
    trackingNumber: text("tracking_number"),
    carrier: text("carrier"), // "Post", "DHL", "DPD", "Planzer", "Camion", etc.
    expectedDeliveryDate: date("expected_delivery_date"),
    actualDeliveryDate: date("actual_delivery_date"),
    status: text("status").default("ordered").notNull(), // ordered, confirmed, shipped, in_transit, delivered, partial, delayed
    notes: text("notes"),
    trackingUrl: text("tracking_url"),
    lastStatusUpdate: timestamp("last_status_update"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_delivery_tracking_org_id").on(table.organizationId),
    index("idx_delivery_tracking_order_id").on(table.orderId),
    index("idx_delivery_tracking_status").on(table.status),
    index("idx_delivery_tracking_expected_date").on(table.expectedDeliveryDate),
  ]
);

export type DeliveryTracking = typeof deliveryTracking.$inferSelect;
export type NewDeliveryTracking = typeof deliveryTracking.$inferInsert;

// ─── Warranty Claims (Garantieansprüche) ─────────────────────────────
export const warrantyClaims = pgTable(
  "warranty_claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    warrantyRecordId: uuid("warranty_record_id")
      .notNull()
      .references(() => warrantyRecords.id),
    entityType: text("entity_type").notNull(), // "tool", "material"
    entityId: uuid("entity_id").notNull(),
    claimNumber: text("claim_number"), // auto-generated
    reason: text("reason").notNull(),
    description: text("description"),
    photos: jsonb("photos"), // string[] of attachment URLs
    status: text("status").default("draft").notNull(), // draft, submitted, in_review, approved, rejected, resolved
    resolution: text("resolution"), // replacement, repair, refund, rejected
    resolutionNotes: text("resolution_notes"),
    submittedAt: timestamp("submitted_at"),
    resolvedAt: timestamp("resolved_at"),
    submittedById: uuid("submitted_by_id").references(() => users.id),
    assignedToId: uuid("assigned_to_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_warranty_claims_org_id").on(table.organizationId),
    index("idx_warranty_claims_warranty_id").on(table.warrantyRecordId),
    index("idx_warranty_claims_status").on(table.status),
    index("idx_warranty_claims_entity").on(table.entityType, table.entityId),
  ]
);

export type WarrantyClaim = typeof warrantyClaims.$inferSelect;
export type NewWarrantyClaim = typeof warrantyClaims.$inferInsert;

// ─── Stock Auto-Adjust Settings ──────────────────────────────────────
export const stockAutoAdjustSettings = pgTable(
  "stock_auto_adjust_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    materialId: uuid("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => locations.id),
    enabled: boolean("enabled").default(true).notNull(),
    algorithm: text("algorithm").default("moving_average").notNull(), // moving_average, exponential_smoothing, seasonal
    lookbackDays: integer("lookback_days").default(90),
    safetyFactor: integer("safety_factor").default(150), // 150 = 1.5x (percentage)
    lastCalculatedAt: timestamp("last_calculated_at"),
    calculatedMin: integer("calculated_min"),
    calculatedMax: integer("calculated_max"),
    calculatedReorderPoint: integer("calculated_reorder_point"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_stock_auto_adjust_org_id").on(table.organizationId),
    index("idx_stock_auto_adjust_material_id").on(table.materialId),
    index("idx_stock_auto_adjust_location_id").on(table.locationId),
  ]
);

export type StockAutoAdjustSetting = typeof stockAutoAdjustSettings.$inferSelect;
export type NewStockAutoAdjustSetting = typeof stockAutoAdjustSettings.$inferInsert;

// ─── Geofences ───────────────────────────────────────────────────────
export const geofences = pgTable(
  "geofences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    latitude: text("latitude").notNull(),
    longitude: text("longitude").notNull(),
    radiusMeters: integer("radius_meters").default(100).notNull(),
    autoCheckin: boolean("auto_checkin").default(true),
    autoCheckout: boolean("auto_checkout").default(true),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_geofences_org_id").on(table.organizationId),
    index("idx_geofences_location_id").on(table.locationId),
  ]
);

export type Geofence = typeof geofences.$inferSelect;
export type NewGeofence = typeof geofences.$inferInsert;

// ─── Geofence Events ────────────────────────────────────────────────
export const geofenceEvents = pgTable(
  "geofence_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    geofenceId: uuid("geofence_id")
      .notNull()
      .references(() => geofences.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    eventType: text("event_type").notNull(), // "enter", "exit"
    triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
    latitude: text("latitude"),
    longitude: text("longitude"),
    autoAction: text("auto_action"), // "checkin", "checkout", null
  },
  (table) => [
    index("idx_geofence_events_org_id").on(table.organizationId),
    index("idx_geofence_events_geofence_id").on(table.geofenceId),
    index("idx_geofence_events_user_id").on(table.userId),
    index("idx_geofence_events_triggered_at").on(table.triggeredAt),
  ]
);

export type GeofenceEvent = typeof geofenceEvents.$inferSelect;
export type NewGeofenceEvent = typeof geofenceEvents.$inferInsert;

// ─── Vendor Portal Tokens ────────────────────────────────────────────
export const vendorPortalTokens = pgTable(
  "vendor_portal_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    email: text("email").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastAccessedAt: timestamp("last_accessed_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_vendor_portal_tokens_org_id").on(table.organizationId),
    index("idx_vendor_portal_tokens_supplier_id").on(table.supplierId),
    index("idx_vendor_portal_tokens_token").on(table.token),
  ]
);

export type VendorPortalToken = typeof vendorPortalTokens.$inferSelect;
export type NewVendorPortalToken = typeof vendorPortalTokens.$inferInsert;

// ─── Customer Portal Tokens ──────────────────────────────────────────
export const customerPortalTokens = pgTable(
  "customer_portal_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    email: text("email").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    lastAccessedAt: timestamp("last_accessed_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_customer_portal_tokens_org_id").on(table.organizationId),
    index("idx_customer_portal_tokens_customer_id").on(table.customerId),
    index("idx_customer_portal_tokens_token").on(table.token),
  ]
);

export type CustomerPortalToken = typeof customerPortalTokens.$inferSelect;
export type NewCustomerPortalToken = typeof customerPortalTokens.$inferInsert;

// ─── Bluetooth Beacons ───────────────────────────────────────────────
export const bleBeacons = pgTable(
  "ble_beacons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => locations.id),
    uuid: text("beacon_uuid").notNull(), // iBeacon UUID
    major: integer("major"), // iBeacon major
    minor: integer("minor"), // iBeacon minor
    name: text("name"),
    entityType: text("entity_type"), // "tool", "location", "zone"
    entityId: uuid("entity_id"),
    batteryLevel: integer("battery_level"), // 0-100
    lastSeenAt: timestamp("last_seen_at"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_ble_beacons_org_id").on(table.organizationId),
    index("idx_ble_beacons_location_id").on(table.locationId),
    index("idx_ble_beacons_uuid").on(table.uuid),
  ]
);

export type BleBeacon = typeof bleBeacons.$inferSelect;
export type NewBleBeacon = typeof bleBeacons.$inferInsert;

// ─── Two-Factor Authentication ──────────────────────────────────────
export const twoFactorSecrets = pgTable(
  "two_factor_secrets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    secret: text("secret").notNull(),
    recoveryCodes: jsonb("recovery_codes"),
    usedRecoveryCodes: jsonb("used_recovery_codes"),
    enabled: boolean("enabled").default(false).notNull(),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_two_factor_secrets_user_id").on(table.userId)]
);

export type TwoFactorSecret = typeof twoFactorSecrets.$inferSelect;
export type NewTwoFactorSecret = typeof twoFactorSecrets.$inferInsert;

// ─── Plugins (Marketplace) ──────────────────────────────────────────
export const plugins = pgTable("plugins", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  version: text("version").default("1.0.0"),
  author: text("author"),
  icon: text("icon"),
  category: text("category"), // "import", "export", "integration", "utility"
  configSchema: jsonb("config_schema"),
  events: jsonb("events"), // string[]
  webhookUrl: text("webhook_url"),
  isBuiltin: boolean("is_builtin").default(false),
  isPublished: boolean("is_published").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Plugin = typeof plugins.$inferSelect;
export type NewPlugin = typeof plugins.$inferInsert;

// ─── Plugin Installations ───────────────────────────────────────────
export const pluginInstallations = pgTable(
  "plugin_installations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    pluginId: uuid("plugin_id")
      .notNull()
      .references(() => plugins.id, { onDelete: "cascade" }),
    config: jsonb("config"),
    enabled: boolean("enabled").default(true),
    installedBy: uuid("installed_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_plugin_installations_org_id").on(table.organizationId),
    index("idx_plugin_installations_plugin_id").on(table.pluginId),
    uniqueIndex("idx_plugin_installations_org_plugin").on(
      table.organizationId,
      table.pluginId
    ),
  ]
);

export type PluginInstallation = typeof pluginInstallations.$inferSelect;
export type NewPluginInstallation = typeof pluginInstallations.$inferInsert;

// ─── Organization Settings (Security & Retention) ────────────────────
export const orgSettings = pgTable(
  "org_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // "ip_allowlist", "data_retention", etc.
    value: jsonb("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_org_settings_org_id").on(table.organizationId),
    uniqueIndex("idx_org_settings_org_key").on(
      table.organizationId,
      table.key
    ),
  ]
);

export type OrgSetting = typeof orgSettings.$inferSelect;
export type NewOrgSetting = typeof orgSettings.$inferInsert;

// ═════════════════════════════════════════════════════════════════════
// Enterprise Features
// ═════════════════════════════════════════════════════════════════════

// ─── Reseller Branding (White-Label) ─────────────────────────────────
export const resellerBranding = pgTable("reseller_branding", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }).unique(),
  appName: text("app_name"), // e.g. "BauLager Pro" instead of "Zentory"
  logoUrl: text("logo_url"),
  faviconUrl: text("favicon_url"),
  primaryColor: text("primary_color"),
  accentColor: text("accent_color"),
  customDomain: text("custom_domain"), // e.g. "lager.meinfirma.ch"
  hideZentoryBranding: boolean("hide_zentory_branding").default(false),
  customFooterText: text("custom_footer_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ResellerBranding = typeof resellerBranding.$inferSelect;
export type NewResellerBranding = typeof resellerBranding.$inferInsert;

// ─── Label Templates (Etiketten-Designer) ────────────────────────────
export const labelTemplates = pgTable(
  "label_templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    width: integer("width").notNull(), // mm
    height: integer("height").notNull(), // mm
    elements: jsonb("elements").notNull(), // LabelElement[]
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_label_templates_org_id").on(table.organizationId)]
);

export type LabelTemplate = typeof labelTemplates.$inferSelect;
export type NewLabelTemplate = typeof labelTemplates.$inferInsert;

// ─── Recurring Orders (Wiederkehrende Bestellungen) ──────────────────
export const recurringOrders = pgTable(
  "recurring_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => suppliers.id),
    name: text("name").notNull(),
    items: jsonb("items").notNull(), // [{materialId, quantity}]
    frequency: text("frequency").notNull(), // "weekly", "biweekly", "monthly"
    dayOfWeek: integer("day_of_week"), // 0=Sunday, 1=Monday...
    dayOfMonth: integer("day_of_month"), // 1-28
    nextRunAt: timestamp("next_run_at"),
    lastRunAt: timestamp("last_run_at"),
    isActive: boolean("is_active").default(true).notNull(),
    createdById: uuid("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_recurring_orders_org_id").on(table.organizationId),
    index("idx_recurring_orders_next_run").on(table.nextRunAt),
  ]
);

export type RecurringOrder = typeof recurringOrders.$inferSelect;
export type NewRecurringOrder = typeof recurringOrders.$inferInsert;

// ─── Status Checks (System-Überwachung) ─────────────────────────────
export const statusChecks = pgTable("status_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull(), // "operational", "degraded", "outage"
  apiLatency: integer("api_latency"), // ms
  dbLatency: integer("db_latency"), // ms
  authStatus: text("auth_status"), // "up", "down"
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
}, (table) => [
  index("idx_status_checks_checked_at").on(table.checkedAt),
]);

export type StatusCheck = typeof statusChecks.$inferSelect;
export type NewStatusCheck = typeof statusChecks.$inferInsert;
