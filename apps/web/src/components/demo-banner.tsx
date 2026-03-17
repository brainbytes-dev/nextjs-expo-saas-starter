"use client";

import { DEMO_MODE } from "@/lib/demo-mode";

export function DemoBanner() {
  if (!DEMO_MODE) return null;

  return (
    <div className="bg-amber-100 dark:bg-amber-900/50 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-center text-sm text-amber-800 dark:text-amber-200">
      This is a live demo. Data is not persisted.{" "}
      <a
        href="https://github.com/your-org/your-repo"
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 font-medium hover:text-amber-900 dark:hover:text-amber-100"
      >
        View on GitHub &rarr;
      </a>
    </div>
  );
}
