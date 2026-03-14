import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeTitle(title: string): string {
  return title.replace(/^(the\s+)/i, "").trim();
}
