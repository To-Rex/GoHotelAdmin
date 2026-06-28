import api from "@/api/client"
import type {
  Invoice,
  InvoiceCreateRequest,
  Payment,
  PaymentCreateRequest,
  Ledger,
  JournalEntry,
  JournalEntryCreateRequest,
} from "@/types/finance"

export async function getInvoices(params?: Record<string, string>) {
  const res = await api.get("/finance/invoices", { params })
  return res.data
}

export async function getInvoice(id: string): Promise<Invoice> {
  const res = await api.get(`/finance/invoices/${id}`)
  return res.data
}

export async function createInvoice(
  data: InvoiceCreateRequest
): Promise<Invoice> {
  const res = await api.post("/finance/invoices", data)
  return res.data
}

export async function payInvoice(
  id: string,
  data: PaymentCreateRequest
): Promise<Payment> {
  const res = await api.post(`/finance/invoices/${id}/pay`, data)
  return res.data
}

export async function getPayments(params?: Record<string, string>) {
  const res = await api.get("/finance/payments", { params })
  return res.data
}

export async function getLedgers(params?: Record<string, string>) {
  const res = await api.get("/finance/ledgers", { params })
  return res.data
}

export async function getJournalEntries(params?: Record<string, string>) {
  const res = await api.get("/finance/journal-entries", { params })
  return res.data
}

export async function createJournalEntry(
  data: JournalEntryCreateRequest
): Promise<JournalEntry> {
  const res = await api.post("/finance/journal-entries", data)
  return res.data
}
