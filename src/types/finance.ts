import type {
  InvoiceStatus,
  PaymentMethod,
  JournalStatus,
  LedgerType,
} from "./common"

export interface Invoice {
  id: string
  hotel_id: string
  reservation_id: string | null
  guest_id: string | null
  invoice_number: string
  invoice_date: string
  due_date: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  paid_amount: number
  status: InvoiceStatus
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  reservation?: { id: string; reservation_number: string }
  guest?: { id: string; first_name: string; last_name: string }
  line_items?: InvoiceLineItem[]
  payments?: Payment[]
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  hotel_id: string
  description: string
  line_type: string
  reference_type: string | null
  reference_id: string | null
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface InvoiceCreateRequest {
  hotel_id: string
  reservation_id?: string
  guest_id?: string
  invoice_date?: string
  due_date?: string
  notes?: string
  line_items?: InvoiceLineItemCreate[]
}

export interface InvoiceLineItemCreate {
  description: string
  line_type?: string
  quantity: number
  unit_price: number
}

export interface Payment {
  id: string
  hotel_id: string
  invoice_id: string | null
  payment_number: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  reference: string | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface PaymentCreateRequest {
  invoice_id: string
  amount: number
  payment_method: PaymentMethod
  payment_date?: string
  reference?: string
  notes?: string
}

export interface Ledger {
  id: string
  hotel_id: string
  name: string
  code: string
  type: LedgerType
  parent_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  children?: Ledger[]
}

export interface JournalEntry {
  id: string
  hotel_id: string
  entry_number: string
  entry_date: string
  reference_type: string | null
  reference_id: string | null
  description: string | null
  total_debit: number
  total_credit: number
  status: JournalStatus
  posted_by: string | null
  posted_at: string | null
  created_at: string
  updated_at: string
  lines?: JournalEntryLine[]
}

export interface JournalEntryLine {
  id: string
  journal_entry_id: string
  hotel_id: string
  ledger_id: string
  debit: number
  credit: number
  description: string | null
}

export interface JournalEntryCreateRequest {
  hotel_id: string
  entry_date?: string
  description?: string
  lines: JournalEntryLineCreate[]
}

export interface JournalEntryLineCreate {
  ledger_id: string
  debit?: number
  credit?: number
  description?: string
}
