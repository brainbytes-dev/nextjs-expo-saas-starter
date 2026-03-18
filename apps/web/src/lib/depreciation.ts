// ---------------------------------------------------------------------------
// Depreciation & TCO Engine
// ---------------------------------------------------------------------------

export interface DepreciationSchedule {
  year: number;
  startValue: number;       // CHF
  depreciation: number;     // CHF deducted this year
  endValue: number;         // CHF at end of year
  accumulatedDepreciation: number; // total CHF depreciated so far
}

/**
 * Linear (straight-line) depreciation.
 * Annual depreciation = (purchasePrice - salvageValue) / lifeYears
 */
export function calculateLinearDepreciation(
  purchasePrice: number,
  salvageValue: number,
  lifeYears: number
): DepreciationSchedule[] {
  if (lifeYears <= 0) return [];
  const annualDep = Math.max(0, (purchasePrice - salvageValue) / lifeYears);
  const schedule: DepreciationSchedule[] = [];
  let accumulated = 0;

  for (let year = 1; year <= lifeYears; year++) {
    const startValue = purchasePrice - accumulated;
    const depreciation = year < lifeYears ? annualDep : Math.max(0, startValue - salvageValue);
    accumulated += depreciation;
    schedule.push({
      year,
      startValue: Math.round(startValue * 100) / 100,
      depreciation: Math.round(depreciation * 100) / 100,
      endValue: Math.round((startValue - depreciation) * 100) / 100,
      accumulatedDepreciation: Math.round(accumulated * 100) / 100,
    });
  }
  return schedule;
}

/**
 * Declining-balance depreciation.
 * Default rate: 2 / lifeYears (double-declining balance).
 * Each year: depreciation = currentValue * rate (floored at salvageValue).
 */
export function calculateDecliningDepreciation(
  purchasePrice: number,
  salvageValue: number,
  lifeYears: number,
  rate?: number
): DepreciationSchedule[] {
  if (lifeYears <= 0) return [];
  const r = rate ?? (2 / lifeYears);
  const schedule: DepreciationSchedule[] = [];
  let currentValue = purchasePrice;
  let accumulated = 0;

  for (let year = 1; year <= lifeYears; year++) {
    const startValue = currentValue;
    let depreciation = startValue * r;
    // Cannot depreciate below salvageValue
    depreciation = Math.min(depreciation, Math.max(0, startValue - salvageValue));
    // On final year, bring down to salvageValue
    if (year === lifeYears) {
      depreciation = Math.max(0, startValue - salvageValue);
    }
    accumulated += depreciation;
    currentValue = startValue - depreciation;
    schedule.push({
      year,
      startValue: Math.round(startValue * 100) / 100,
      depreciation: Math.round(depreciation * 100) / 100,
      endValue: Math.round(currentValue * 100) / 100,
      accumulatedDepreciation: Math.round(accumulated * 100) / 100,
    });
  }
  return schedule;
}

/**
 * Calculate current book value based on purchase date and chosen method.
 * Returns purchasePrice if no date is given.
 */
export function getCurrentBookValue(
  purchasePrice: number,
  purchaseDate: string | null,
  salvageValue: number,
  lifeYears: number,
  method: "linear" | "declining"
): number {
  if (!purchaseDate || lifeYears <= 0) return purchasePrice;

  const purchase = new Date(purchaseDate);
  const now = new Date();
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  const yearsElapsed = (now.getTime() - purchase.getTime()) / msPerYear;

  if (yearsElapsed <= 0) return purchasePrice;
  if (yearsElapsed >= lifeYears) return salvageValue;

  const schedule =
    method === "linear"
      ? calculateLinearDepreciation(purchasePrice, salvageValue, lifeYears)
      : calculateDecliningDepreciation(purchasePrice, salvageValue, lifeYears);

  const yearIndex = Math.floor(yearsElapsed); // completed full years
  const fraction = yearsElapsed - yearIndex;  // partial year progress

  if (yearIndex >= schedule.length) return salvageValue;

  const completedYearValue = schedule[yearIndex]!.startValue;
  const nextYearDep = schedule[yearIndex]!.depreciation;

  // Interpolate within the current year
  return Math.max(
    salvageValue,
    Math.round((completedYearValue - nextYearDep * fraction) * 100) / 100
  );
}

export interface TCOResult {
  purchase: number;
  maintenance: number;
  insurance: number;
  total: number;
}

interface TCOInput {
  purchasePrice: number | null;
  purchaseDate: string | null;
  expectedLifeYears: number | null;
  maintenanceCostPerYear?: number | null;
  insuranceCostPerYear?: number | null;
}

/**
 * Total Cost of Ownership = purchase price + maintenance costs + insurance costs
 * over the expected life of the tool.
 */
export function calculateTCO(tool: TCOInput): TCOResult {
  const purchase = tool.purchasePrice ?? 0;
  const years = tool.expectedLifeYears ?? 1;
  const maintenance = (tool.maintenanceCostPerYear ?? 0) * years;
  const insurance = (tool.insuranceCostPerYear ?? 0) * years;
  return {
    purchase,
    maintenance,
    insurance,
    total: purchase + maintenance + insurance,
  };
}
