import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Human-readable message from an axios/FastAPI error, or null when there is none. */
export function apiErrorMessage(error: unknown): string | null {
  if (!error) return null
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail
      .map((d) => (d as { msg?: string })?.msg ?? JSON.stringify(d))
      .join("; ")
  }
  if (typeof detail === "string") return detail
  return (error as { message?: string })?.message ?? String(error)
}

function getLocale(): string {
  try {
    const stored = localStorage.getItem("gohotel-lang")
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed === "uz") return "uz-UZ"
      if (parsed === "ru") return "ru-RU"
      if (parsed === "en") return "en-US"
    }
  } catch {}
  return "en-US"
}

export function formatCurrency(amount: number): string {
  const locale = getLocale()
  const currency = locale === "uz-UZ" ? "UZS" : "USD"
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d)
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return "-"
  return new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}
