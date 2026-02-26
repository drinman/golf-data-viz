/**
 * Shared utility functions.
 *
 * Includes the cn() helper for merging Tailwind classes (used by shadcn/ui).
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
