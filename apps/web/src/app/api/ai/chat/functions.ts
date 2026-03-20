import type { Database } from "@repo/db";
import {
  materials,
  materialStocks,
  tools,
  locations,
  orders,
  orderItems,
  stockChanges,
  suppliers,
} from "@repo/db/schema";
import { eq, and, ilike, or, sql, lt } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Db = Database;

// ---------------------------------------------------------------------------
// OpenAI Function Definitions (tool calling schema)
// ---------------------------------------------------------------------------

export const aiFunctionDefinitions = [
  {
    type: "function" as const,
    function: {
      name: "search_materials",
      description:
        "Sucht Materialien/Verbrauchsmaterial nach Name, Nummer oder Hersteller. Gibt bis zu 10 Ergebnisse mit aktuellem Bestand zurück.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Suchbegriff (Name, Nummer oder Hersteller)",
          },
          groupName: {
            type: "string",
            description: "Optional: Materialgruppe filtern",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_tools",
      description:
        "Sucht Werkzeuge/Geräte nach Name, Nummer oder Seriennummer. Optional nach Zustand filtern.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Suchbegriff (Name, Nummer, Seriennummer)",
          },
          condition: {
            type: "string",
            enum: ["good", "damaged", "repair", "decommissioned"],
            description: "Optional: Zustand filtern",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_stock_level",
      description:
        "Gibt den Bestand eines Materials pro Lagerort zurück.",
      parameters: {
        type: "object",
        properties: {
          materialName: {
            type: "string",
            description: "Name des Materials (wird per Ähnlichkeitssuche gefunden)",
          },
        },
        required: ["materialName"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_low_stock_items",
      description:
        "Gibt alle Materialien zurück, deren Gesamtbestand unter dem Meldebestand liegt.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_overdue_tools",
      description:
        "Gibt Werkzeuge zurück, deren Wartung überfällig ist (next_maintenance_date in der Vergangenheit).",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_order",
      description:
        "Erstellt eine neue Bestellung bei einem Lieferanten. Gibt die erstellte Bestellung zurück.",
      parameters: {
        type: "object",
        properties: {
          supplierName: {
            type: "string",
            description: "Name des Lieferanten (wird per Ähnlichkeitssuche gefunden)",
          },
          items: {
            type: "array",
            description: "Bestellpositionen",
            items: {
              type: "object",
              properties: {
                materialName: {
                  type: "string",
                  description: "Name des Materials",
                },
                quantity: {
                  type: "number",
                  description: "Bestellmenge",
                },
              },
              required: ["materialName", "quantity"],
            },
          },
        },
        required: ["supplierName", "items"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "book_stock_change",
      description:
        "Bucht eine Bestandsänderung (Zugang, Abgang, Korrektur) für ein Material an einem Lagerort.",
      parameters: {
        type: "object",
        properties: {
          materialName: {
            type: "string",
            description: "Name des Materials",
          },
          quantity: {
            type: "number",
            description: "Menge (positiv für Zugang, negativ für Abgang)",
          },
          type: {
            type: "string",
            enum: ["in", "out", "correction"],
            description: "Art der Änderung",
          },
          locationName: {
            type: "string",
            description: "Name des Lagerorts",
          },
          notes: {
            type: "string",
            description: "Optional: Bemerkung zur Buchung",
          },
        },
        required: ["materialName", "quantity", "type", "locationName"],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Function Implementations
// ---------------------------------------------------------------------------

export async function searchMaterials(
  db: Db,
  orgId: string,
  args: { query: string; groupName?: string }
): Promise<string> {
  const pattern = `%${args.query}%`;

  const rows = await db
    .select({
      id: materials.id,
      number: materials.number,
      name: materials.name,
      unit: materials.unit,
      manufacturer: materials.manufacturer,
      reorderLevel: materials.reorderLevel,
      totalStock: sql<number>`COALESCE(SUM(${materialStocks.quantity}), 0)`.as(
        "total_stock"
      ),
    })
    .from(materials)
    .leftJoin(
      materialStocks,
      and(
        eq(materialStocks.materialId, materials.id),
        eq(materialStocks.organizationId, materials.organizationId)
      )
    )
    .where(
      and(
        eq(materials.organizationId, orgId),
        eq(materials.isActive, true),
        or(
          ilike(materials.name, pattern),
          ilike(materials.number, pattern),
          ilike(materials.manufacturer, pattern)
        )
      )
    )
    .groupBy(
      materials.id,
      materials.number,
      materials.name,
      materials.unit,
      materials.manufacturer,
      materials.reorderLevel
    )
    .limit(10);

  if (rows.length === 0) {
    return JSON.stringify({
      message: `Keine Materialien gefunden für "${args.query}".`,
      results: [],
    });
  }

  return JSON.stringify({
    message: `${rows.length} Material(ien) gefunden:`,
    results: rows.map((r) => ({
      id: r.id,
      nummer: r.number,
      name: r.name,
      einheit: r.unit,
      hersteller: r.manufacturer,
      bestand: Number(r.totalStock),
      meldebestand: r.reorderLevel,
      unterMeldebestand: Number(r.totalStock) < (r.reorderLevel ?? 0),
    })),
  });
}

export async function searchTools(
  db: Db,
  orgId: string,
  args: { query: string; condition?: string }
): Promise<string> {
  const pattern = `%${args.query}%`;

  const conditions = [
    eq(tools.organizationId, orgId),
    eq(tools.isActive, true),
    or(
      ilike(tools.name, pattern),
      ilike(tools.number, pattern),
      ilike(tools.serialNumber, pattern),
      ilike(tools.manufacturer, pattern)
    ),
  ];

  if (args.condition) {
    conditions.push(eq(tools.condition, args.condition));
  }

  const rows = await db
    .select({
      id: tools.id,
      number: tools.number,
      name: tools.name,
      manufacturer: tools.manufacturer,
      serialNumber: tools.serialNumber,
      condition: tools.condition,
      nextMaintenanceDate: tools.nextMaintenanceDate,
    })
    .from(tools)
    .where(and(...conditions))
    .limit(10);

  if (rows.length === 0) {
    return JSON.stringify({
      message: `Keine Werkzeuge gefunden für "${args.query}".`,
      results: [],
    });
  }

  const conditionLabels: Record<string, string> = {
    good: "Gut",
    damaged: "Beschädigt",
    repair: "In Reparatur",
    decommissioned: "Ausgemustert",
  };

  return JSON.stringify({
    message: `${rows.length} Werkzeug(e) gefunden:`,
    results: rows.map((r) => ({
      id: r.id,
      nummer: r.number,
      name: r.name,
      hersteller: r.manufacturer,
      seriennummer: r.serialNumber,
      zustand: conditionLabels[r.condition ?? "good"] ?? r.condition,
      naechsteWartung: r.nextMaintenanceDate,
    })),
  });
}

export async function getStockLevel(
  db: Db,
  orgId: string,
  args: { materialName: string }
): Promise<string> {
  const pattern = `%${args.materialName}%`;

  const rows = await db
    .select({
      materialId: materials.id,
      materialName: materials.name,
      materialNumber: materials.number,
      unit: materials.unit,
      reorderLevel: materials.reorderLevel,
      locationName: locations.name,
      locationType: locations.type,
      quantity: materialStocks.quantity,
    })
    .from(materialStocks)
    .innerJoin(materials, eq(materials.id, materialStocks.materialId))
    .innerJoin(locations, eq(locations.id, materialStocks.locationId))
    .where(
      and(
        eq(materialStocks.organizationId, orgId),
        or(
          ilike(materials.name, pattern),
          ilike(materials.number, pattern)
        )
      )
    )
    .limit(20);

  if (rows.length === 0) {
    return JSON.stringify({
      message: `Kein Bestand gefunden für "${args.materialName}".`,
      results: [],
    });
  }

  // Group by material
  const grouped: Record<
    string,
    {
      name: string;
      nummer: string | null;
      einheit: string | null;
      meldebestand: number | null;
      lagerorte: { name: string; typ: string; menge: number }[];
      gesamt: number;
    }
  > = {};

  for (const r of rows) {
    if (!grouped[r.materialId]) {
      grouped[r.materialId] = {
        name: r.materialName,
        nummer: r.materialNumber,
        einheit: r.unit,
        meldebestand: r.reorderLevel,
        lagerorte: [],
        gesamt: 0,
      };
    }
    const qty = r.quantity ?? 0;
    grouped[r.materialId].lagerorte.push({
      name: r.locationName,
      typ: r.locationType,
      menge: qty,
    });
    grouped[r.materialId].gesamt += qty;
  }

  return JSON.stringify({
    message: `Bestand für ${Object.keys(grouped).length} Material(ien):`,
    results: Object.values(grouped),
  });
}

export async function getLowStockItems(
  db: Db,
  orgId: string
): Promise<string> {
  const rows = await db
    .select({
      id: materials.id,
      name: materials.name,
      number: materials.number,
      unit: materials.unit,
      reorderLevel: materials.reorderLevel,
      totalStock: sql<number>`COALESCE(SUM(${materialStocks.quantity}), 0)`.as(
        "total_stock"
      ),
    })
    .from(materials)
    .leftJoin(
      materialStocks,
      and(
        eq(materialStocks.materialId, materials.id),
        eq(materialStocks.organizationId, materials.organizationId)
      )
    )
    .where(
      and(
        eq(materials.organizationId, orgId),
        eq(materials.isActive, true),
        sql`${materials.reorderLevel} > 0`
      )
    )
    .groupBy(
      materials.id,
      materials.name,
      materials.number,
      materials.unit,
      materials.reorderLevel
    )
    .having(
      sql`COALESCE(SUM(${materialStocks.quantity}), 0) < ${materials.reorderLevel}`
    )
    .limit(20);

  if (rows.length === 0) {
    return JSON.stringify({
      message: "Alle Materialien sind über dem Meldebestand. Alles in Ordnung!",
      results: [],
    });
  }

  return JSON.stringify({
    message: `${rows.length} Material(ien) unter Meldebestand:`,
    results: rows.map((r) => ({
      id: r.id,
      name: r.name,
      nummer: r.number,
      einheit: r.unit,
      bestand: Number(r.totalStock),
      meldebestand: r.reorderLevel,
      fehlmenge: (r.reorderLevel ?? 0) - Number(r.totalStock),
    })),
  });
}

export async function getOverdueTools(
  db: Db,
  orgId: string
): Promise<string> {
  const today = new Date().toISOString().split("T")[0]!;

  const rows = await db
    .select({
      id: tools.id,
      name: tools.name,
      number: tools.number,
      manufacturer: tools.manufacturer,
      condition: tools.condition,
      nextMaintenanceDate: tools.nextMaintenanceDate,
      lastMaintenanceDate: tools.lastMaintenanceDate,
    })
    .from(tools)
    .where(
      and(
        eq(tools.organizationId, orgId),
        eq(tools.isActive, true),
        lt(tools.nextMaintenanceDate, today)
      )
    )
    .limit(20);

  if (rows.length === 0) {
    return JSON.stringify({
      message: "Keine Werkzeuge mit überfälliger Wartung. Alles aktuell!",
      results: [],
    });
  }

  return JSON.stringify({
    message: `${rows.length} Werkzeug(e) mit überfälliger Wartung:`,
    results: rows.map((r) => ({
      id: r.id,
      name: r.name,
      nummer: r.number,
      hersteller: r.manufacturer,
      zustand: r.condition,
      faelligSeit: r.nextMaintenanceDate,
      letzteWartung: r.lastMaintenanceDate,
    })),
  });
}

export async function createOrder(
  db: Db,
  orgId: string,
  userId: string,
  args: { supplierName: string; items: { materialName: string; quantity: number }[] }
): Promise<string> {
  // Find supplier
  const [supplier] = await db
    .select({ id: suppliers.id, name: suppliers.name })
    .from(suppliers)
    .where(
      and(
        eq(suppliers.organizationId, orgId),
        ilike(suppliers.name, `%${args.supplierName}%`)
      )
    )
    .limit(1);

  if (!supplier) {
    return JSON.stringify({
      error: true,
      message: `Lieferant "${args.supplierName}" nicht gefunden. Bitte prüfen Sie den Namen.`,
    });
  }

  // Resolve materials
  const resolvedItems: { materialId: string; materialName: string; quantity: number }[] = [];
  const notFound: string[] = [];

  for (const item of args.items) {
    const [mat] = await db
      .select({ id: materials.id, name: materials.name })
      .from(materials)
      .where(
        and(
          eq(materials.organizationId, orgId),
          eq(materials.isActive, true),
          ilike(materials.name, `%${item.materialName}%`)
        )
      )
      .limit(1);

    if (mat) {
      resolvedItems.push({
        materialId: mat.id,
        materialName: mat.name,
        quantity: item.quantity,
      });
    } else {
      notFound.push(item.materialName);
    }
  }

  if (resolvedItems.length === 0) {
    return JSON.stringify({
      error: true,
      message: `Keine der angegebenen Materialien gefunden: ${notFound.join(", ")}`,
    });
  }

  // Create order
  const today = new Date().toISOString().split("T")[0]!;
  const [order] = await db
    .insert(orders)
    .values({
      organizationId: orgId,
      supplierId: supplier.id,
      status: "draft",
      orderDate: today,
      notes: "Erstellt via KI-Assistent",
    })
    .returning({ id: orders.id, orderNumber: orders.orderNumber });

  // Create order items
  for (const item of resolvedItems) {
    await db.insert(orderItems).values({
      orderId: order!.id,
      materialId: item.materialId,
      quantity: item.quantity,
    });
  }

  const result: Record<string, unknown> = {
    message: `Bestellung bei ${supplier.name} erstellt (Entwurf).`,
    orderId: order!.id,
    lieferant: supplier.name,
    positionen: resolvedItems.map((i) => ({
      material: i.materialName,
      menge: i.quantity,
    })),
    status: "Entwurf",
    link: `/dashboard/orders/${order!.id}`,
  };

  if (notFound.length > 0) {
    result.warnung = `Folgende Materialien wurden nicht gefunden und übersprungen: ${notFound.join(", ")}`;
  }

  return JSON.stringify(result);
}

export async function bookStockChange(
  db: Db,
  orgId: string,
  userId: string,
  args: {
    materialName: string;
    quantity: number;
    type: string;
    locationName: string;
    notes?: string;
  }
): Promise<string> {
  // Find material
  const [mat] = await db
    .select({ id: materials.id, name: materials.name })
    .from(materials)
    .where(
      and(
        eq(materials.organizationId, orgId),
        eq(materials.isActive, true),
        ilike(materials.name, `%${args.materialName}%`)
      )
    )
    .limit(1);

  if (!mat) {
    return JSON.stringify({
      error: true,
      message: `Material "${args.materialName}" nicht gefunden.`,
    });
  }

  // Find location
  const [loc] = await db
    .select({ id: locations.id, name: locations.name })
    .from(locations)
    .where(
      and(
        eq(locations.organizationId, orgId),
        eq(locations.isActive, true),
        ilike(locations.name, `%${args.locationName}%`)
      )
    )
    .limit(1);

  if (!loc) {
    return JSON.stringify({
      error: true,
      message: `Lagerort "${args.locationName}" nicht gefunden.`,
    });
  }

  // Get current stock
  const [currentStock] = await db
    .select({ id: materialStocks.id, quantity: materialStocks.quantity })
    .from(materialStocks)
    .where(
      and(
        eq(materialStocks.organizationId, orgId),
        eq(materialStocks.materialId, mat.id),
        eq(materialStocks.locationId, loc.id)
      )
    )
    .limit(1);

  const previousQty = currentStock?.quantity ?? 0;
  const changeQty =
    args.type === "out" ? -Math.abs(args.quantity) : Math.abs(args.quantity);
  const newQty = previousQty + changeQty;

  // Prevent negative stock on withdrawal
  if (newQty < 0) {
    return JSON.stringify({
      error: true,
      message: `Nicht genügend Bestand. Aktuell: ${previousQty}, angefordert: ${Math.abs(args.quantity)}.`,
    });
  }

  // Upsert materialStocks
  if (currentStock) {
    await db
      .update(materialStocks)
      .set({ quantity: newQty, updatedAt: new Date() })
      .where(eq(materialStocks.id, currentStock.id));
  } else {
    await db.insert(materialStocks).values({
      organizationId: orgId,
      materialId: mat.id,
      locationId: loc.id,
      quantity: newQty,
    });
  }

  // Record stock change
  await db.insert(stockChanges).values({
    organizationId: orgId,
    materialId: mat.id,
    locationId: loc.id,
    userId,
    changeType: args.type,
    quantity: changeQty,
    previousQuantity: previousQty,
    newQuantity: newQty,
    notes: args.notes ?? "Gebucht via KI-Assistent",
  });

  const typeLabels: Record<string, string> = {
    in: "Zugang",
    out: "Abgang",
    correction: "Korrektur",
  };

  return JSON.stringify({
    message: `${typeLabels[args.type] ?? args.type}: ${Math.abs(args.quantity)}x ${mat.name} an ${loc.name}.`,
    material: mat.name,
    lagerort: loc.name,
    vorher: previousQty,
    nachher: newQty,
    typ: typeLabels[args.type] ?? args.type,
    link: `/dashboard/materials`,
  });
}

// ---------------------------------------------------------------------------
// Dispatcher — routes function name to implementation
// ---------------------------------------------------------------------------

export async function executeFunction(
  db: Db,
  orgId: string,
  userId: string,
  name: string,
  argsJson: string
): Promise<string> {
  const args = JSON.parse(argsJson);

  switch (name) {
    case "search_materials":
      return searchMaterials(db, orgId, args);
    case "search_tools":
      return searchTools(db, orgId, args);
    case "get_stock_level":
      return getStockLevel(db, orgId, args);
    case "get_low_stock_items":
      return getLowStockItems(db, orgId);
    case "get_overdue_tools":
      return getOverdueTools(db, orgId);
    case "create_order":
      return createOrder(db, orgId, userId, args);
    case "book_stock_change":
      return bookStockChange(db, orgId, userId, args);
    default:
      return JSON.stringify({ error: true, message: `Unbekannte Funktion: ${name}` });
  }
}
