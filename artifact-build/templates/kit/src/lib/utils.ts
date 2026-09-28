import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export const fmt = {
  int: (n: number, locale = "pt-BR") => new Intl.NumberFormat(locale).format(n),
  money: (n: number, currency = "BRL", locale = "pt-BR") => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n),
  pct: (n: number, digits = 0, locale = "pt-BR") => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: digits }).format(n),
  compact: (n: number, locale = "pt-BR") => new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(n),
};
