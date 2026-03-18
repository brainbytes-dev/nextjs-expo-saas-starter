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
// LogistikApp Business Domain Tables
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
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("idx_stock_changes_org_id").on(table.organizationId),
    index("idx_stock_changes_material_id").on(table.materialId),
    index("idx_stock_changes_location_id").on(table.locationId),
    index("idx_stock_changes_created_at").on(table.createdAt),
    index("idx_stock_changes_change_type").on(table.changeType),
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
    status: text("status").default("open"), // "open", "in_progress", "completed", "cancelled"
    notes: text("notes"),
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

// LogistikApp Domain Types
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
