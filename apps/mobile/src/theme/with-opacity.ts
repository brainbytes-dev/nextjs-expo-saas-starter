/**
 * Converts an "rgb(r, g, b)" string to "rgba(r, g, b, opacity)"
 */
export function withOpacity(rgb: string, opacity: number): string {
  return rgb.replace("rgb(", "rgba(").replace(")", `, ${opacity})`);
}
