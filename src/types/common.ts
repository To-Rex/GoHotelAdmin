export type UserType = "SUPER_ADMIN" | "ADMIN" | "EMPLOYEE"
export type UserStatus = "ACTIVE" | "INACTIVE" | "TERMINATED"
export type HotelStatus = "ACTIVE" | "SUSPENDED" | "CLOSED"
export type BranchStatus = "ACTIVE" | "INACTIVE" | "CLOSED"
export type RoomStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "OCCUPIED"
  | "CLEANING"
  | "MAINTENANCE"
  | "INSPECTION"
  | "OUT_OF_SERVICE"
export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "NO_SHOW"
export type HousekeepingTaskType =
  | "CLEANING"
  | "DEEP_CLEANING"
  | "MAINTENANCE"
  | "INSPECTION"
  | "TURN_DOWN"
export type HousekeepingStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
export type HousekeepingPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"
export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PARTIALLY_PAID"
  | "PAID"
  | "CANCELLED"
  | "REFUNDED"
export type PaymentMethod =
  | "CASH"
  | "CREDIT_CARD"
  | "DEBIT_CARD"
  | "BANK_TRANSFER"
  | "MOBILE_PAYMENT"
  | "ONLINE"
export type JournalStatus = "DRAFT" | "POSTED" | "VOIDED"
export type LedgerType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE"
export type ReportType = "OCCUPANCY" | "REVENUE"
export type BookingType = "DAILY" | "HOURLY"
export type PaymentStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID"
export type ServiceCategory = string

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface MessageResponse {
  message: string
}
