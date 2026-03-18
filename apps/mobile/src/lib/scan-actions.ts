import { createStockChange, createToolBooking, addCommissionEntry } from "./api";

export async function stockIn(
  materialId: string,
  locationId: string,
  quantity: number,
  notes?: string
) {
  return createStockChange({ materialId, locationId, changeType: "in", quantity, notes });
}

export async function stockOut(
  materialId: string,
  locationId: string,
  quantity: number,
  notes?: string
) {
  return createStockChange({ materialId, locationId, changeType: "out", quantity, notes });
}

export async function toolCheckout(toolId: string, toLocationId?: string, notes?: string) {
  return createToolBooking(toolId, { bookingType: "checkout", toLocationId, notes });
}

export async function toolCheckin(toolId: string, toLocationId?: string, notes?: string) {
  return createToolBooking(toolId, { bookingType: "checkin", toLocationId, notes });
}

export async function addToCommission(
  commissionId: string,
  itemType: "material" | "tool" | "key",
  itemId: string,
  quantity = 1
) {
  if (itemType === "material") {
    return addCommissionEntry(commissionId, { materialId: itemId, quantity });
  }
  if (itemType === "tool") {
    return addCommissionEntry(commissionId, { toolId: itemId, quantity: 1 });
  }
  // keys not supported as commission entries yet
  throw new Error("Schlüssel können nicht zu Lieferscheinen hinzugefügt werden");
}
