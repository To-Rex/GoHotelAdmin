import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, ChevronDown, ChevronRight, Search, X, Building2, Receipt } from "lucide-react"
import {
  Button,
  Input,
  Select,
  Badge,
  Card,
  CardContent,
  DataTable,
  Modal,
  PageLoader,
} from "@/components/ui"
import type { Column } from "@/components/ui"
import { getInvoices, createInvoice, payInvoice } from "@/api/modules/finance"
import { getHotels } from "@/api/modules/hotels"
import type { Invoice, InvoiceCreateRequest, PaymentCreateRequest } from "@/types/finance"
import { formatDate, formatCurrency, cn } from "@/lib/utils"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"
import { usePermissions } from "@/lib/permissions"

export function InvoicesPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId } = useScope()
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [createModal, setCreateModal] = useState(false)
  const [payModal, setPayModal] = useState<Invoice | null>(null)
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())

  const invoiceSchema = z.object({
    hotel_id: z.string().min(1, t("finance.invoices.hotelRequired")),
    reservation_id: z.string().optional(),
    guest_id: z.string().optional(),
    invoice_date: z.string().optional(),
    due_date: z.string().optional(),
    notes: z.string().optional(),
  })

  type InvoiceForm = z.infer<typeof invoiceSchema>

  const paySchema = z.object({
    invoice_id: z.string(),
    amount: z.number().min(0.01, t("finance.invoices.amountRequired")),
    payment_method: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "MOBILE_PAYMENT", "ONLINE"]),
    reference: z.string().optional(),
    notes: z.string().optional(),
  })

  type PayForm = z.infer<typeof paySchema>

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", search, page],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), page_size: "10" }
      if (search) params.search = search
      return getInvoices(scopeMerge(params))
    },
  })

  const { data: hotelsData } = useQuery({
    queryKey: ["hotels", "select"],
    queryFn: () => getHotels({ page_size: "200" }),
    enabled: isSuperAdmin,
  })

  const { data: allInvoicesData } = useQuery({
    queryKey: ["invoices", "all"],
    queryFn: () => getInvoices(scopeMerge({ page_size: "2000" })),
    enabled: isSuperAdmin,
  })

  const allInvoices: Invoice[] = useMemo(
    () => (Array.isArray(allInvoicesData) ? allInvoicesData : (allInvoicesData as any)?.items ?? []),
    [allInvoicesData]
  )

  const hotelsList = useMemo(() => {
    const raw = (hotelsData as any)?.items ?? (Array.isArray(hotelsData) ? hotelsData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [hotelsData])

  const hotelOptions = useMemo(
    () => hotelsList.map((h: any) => ({ value: h.id, label: h.name })),
    [hotelsList]
  )

  const invoices = Array.isArray(data) ? data : (data as any)?.items ?? []
  const filteredInvoices = isSuperAdmin ? invoices : invoices.filter((i: Invoice) => i.hotel_id === hotelId)
  const paginationData =
    data && !Array.isArray(data) && (data as any)?.total_pages
      ? { page: (data as any).page, totalPages: (data as any).total_pages, total: (data as any).total, onPageChange: setPage }
      : undefined

  const q = search.toLowerCase().trim()

  const hotelTree = useMemo(() => {
    if (!isSuperAdmin) return []
    return hotelsList
      .map((hotel: any) => {
        let invs = allInvoices.filter((i) => i.hotel_id === hotel.id)
        if (q) {
          invs = invs.filter(
            (i) =>
              i.invoice_number?.toLowerCase().includes(q) ||
              i.guest?.first_name?.toLowerCase().includes(q) ||
              i.guest?.last_name?.toLowerCase().includes(q)
          )
          if (invs.length === 0 && !hotel.name.toLowerCase().includes(q)) return null
        }
        return { hotel, invoices: invs }
      })
      .filter(Boolean) as { hotel: any; invoices: Invoice[] }[]
  }, [hotelsList, allInvoices, q, isSuperAdmin])

  const toggleHotel = (id: string) => {
    setExpandedHotels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const createMutation = useMutation({
    mutationFn: createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      setCreateModal(false)
    },
  })

  const payMutation = useMutation({
    mutationFn: ({ id, data: payData }: { id: string; data: PaymentCreateRequest }) =>
      payInvoice(id, payData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] })
      setPayModal(null)
    },
  })

  const { register: creg, handleSubmit: chs, reset: crs, formState: { errors: cerrors } } = useForm<InvoiceForm>({ resolver: zodResolver(invoiceSchema) })
  const { register: preg, handleSubmit: phs, reset: prs, formState: { errors: perrors } } = useForm<PayForm>({ resolver: zodResolver(paySchema), defaultValues: { payment_method: "CASH" } })

  const openCreate = (hId?: string) => {
    crs({ hotel_id: hId || hotelId || "" })
    setCreateModal(true)
  }

  const openPay = (inv: Invoice) => {
    prs({ invoice_id: inv.id, amount: inv.total_amount - inv.paid_amount, payment_method: "CASH" })
    setPayModal(inv)
  }

  const onCreate = (values: InvoiceForm) => {
    createMutation.mutate(values as InvoiceCreateRequest)
  }

  const onPay = (values: PayForm) => {
    if (payModal) {
      payMutation.mutate({ id: payModal.id, data: values })
    }
  }

  const columns: Column<Invoice>[] = [
    { key: "invoice_number", header: t("finance.invoices.invoiceNumber") },
    { key: "invoice_date", header: t("finance.invoices.date"), render: (i) => formatDate(i.invoice_date) },
    { key: "guest", header: t("finance.invoices.guest"), render: (i) => i.guest ? `${i.guest.first_name} ${i.guest.last_name}` : "-" },
    { key: "total_amount", header: t("finance.invoices.total"), render: (i) => formatCurrency(i.total_amount) },
    { key: "paid_amount", header: t("finance.invoices.paid"), render: (i) => formatCurrency(i.paid_amount) },
    { key: "status", header: t("finance.invoices.status"), render: (i) => <Badge variant={i.status} /> },
    { key: "actions", header: "", render: (i) =>
        can("finance.payment.create") && ["DRAFT", "ISSUED", "PARTIALLY_PAID"].includes(i.status) ? (
          <Button variant="ghost" size="sm" onClick={() => openPay(i)}>{t("finance.invoices.recordPayment")}</Button>
        ) : null
    },
  ]

  if (isLoading && !isSuperAdmin) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("finance.invoices.title")}</h1>
          <p className="text-gray-500 mt-1">{t("finance.invoices.subtitle")}</p>
        </div>
        {can("finance.invoice.create") && (
          <Button onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            {t("finance.invoices.createInvoice")}
          </Button>
        )}
      </div>

      {isSuperAdmin ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("finance.invoices.searchPlaceholder")} className="pl-10" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
          </div>

          <div className="space-y-2">
            {hotelTree.map(({ hotel, invoices: hotelInvs }) => {
              const isExpanded = expandedHotels.has(hotel.id)
              const totalPaid = hotelInvs.reduce((sum, i) => sum + i.paid_amount, 0)
              const totalAmount = hotelInvs.reduce((sum, i) => sum + i.total_amount, 0)

              return (
                <Card key={hotel.id}>
                  <button onClick={() => toggleHotel(hotel.id)} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors rounded-lg text-left">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                    <Building2 className="h-5 w-5 text-primary-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-gray-900">{hotel.name}</span>
                      {hotel.code && <span className="text-xs text-gray-400 ml-2">({hotel.code})</span>}
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {hotelInvs.length} {t("finance.invoices.title")} | {formatCurrency(totalAmount)}
                    </span>
                    {can("finance.invoice.create") && (
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); if (!isExpanded) toggleHotel(hotel.id); openCreate(hotel.id) }}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {hotelInvs.length === 0 ? (
                        <div className="p-4 text-sm text-gray-400 text-center">{t("finance.invoices.noInvoices", "No invoices")}</div>
                      ) : (
                        <div className="p-2">
                          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-medium text-gray-400 uppercase border-b border-gray-100">
                            <span className="col-span-2">{t("finance.invoices.invoiceNumber")}</span>
                            <span className="col-span-2">{t("finance.invoices.date")}</span>
                            <span className="col-span-2">{t("finance.invoices.guest")}</span>
                            <span className="col-span-1">{t("finance.invoices.total")}</span>
                            <span className="col-span-1">{t("finance.invoices.paid")}</span>
                            <span className="col-span-1">{t("finance.invoices.status")}</span>
                            <span className="col-span-3" />
                          </div>
                          {hotelInvs.map((inv) => (
                            <div key={inv.id} className={cn("grid grid-cols-12 gap-2 px-3 py-2 rounded-md items-center hover:bg-gray-50 transition-colors")}>
                              <span className="col-span-2 font-medium text-gray-900 text-sm truncate">{inv.invoice_number}</span>
                              <span className="col-span-2 text-xs text-gray-500">{formatDate(inv.invoice_date)}</span>
                              <span className="col-span-2 text-sm text-gray-600 truncate">{inv.guest ? `${inv.guest.first_name} ${inv.guest.last_name}` : "-"}</span>
                              <span className="col-span-1 text-sm text-gray-900">{formatCurrency(inv.total_amount)}</span>
                              <span className="col-span-1 text-sm text-emerald-600">{formatCurrency(inv.paid_amount)}</span>
                              <span className="col-span-1"><Badge variant={inv.status} /></span>
                              <span className="col-span-3 flex justify-end">
                                {can("finance.payment.create") && ["DRAFT", "ISSUED", "PARTIALLY_PAID"].includes(inv.status) && (
                                  <Button variant="ghost" size="sm" onClick={() => openPay(inv)}>{t("finance.invoices.recordPayment")}</Button>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
            {hotelTree.length === 0 && allInvoices.length > 0 && (
              <div className="text-center py-12 text-gray-400"><Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>{t("finance.invoices.noInvoices", "No invoices found")}</p></div>
            )}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <DataTable columns={columns} data={filteredInvoices} keyField="id" isLoading={isLoading} searchable searchPlaceholder={t("finance.invoices.searchPlaceholder")} onSearch={setSearch} pagination={paginationData} />
          </CardContent>
        </Card>
      )}

      <Modal open={createModal} onClose={() => setCreateModal(false)} title={t("finance.invoices.createInvoice")}>
        <form onSubmit={chs(onCreate)} className="space-y-4">
          {isSuperAdmin ? (
            <Select id="hotel_id" label={t("finance.invoices.hotelId") + " *"} options={hotelOptions} placeholder={t("finance.invoices.selectHotel", "Select hotel")} error={cerrors.hotel_id?.message} {...creg("hotel_id")} />
          ) : (
            <Input id="hotel_id" label={t("finance.invoices.hotelId") + " *"} placeholder={t("finance.invoices.uuid")} error={cerrors.hotel_id?.message} disabled {...creg("hotel_id")} />
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input id="reservation_id" label={t("finance.invoices.reservationId")} placeholder={t("finance.invoices.uuid")} {...creg("reservation_id")} />
            <Input id="guest_id" label={t("finance.invoices.guestId")} placeholder={t("finance.invoices.uuid")} {...creg("guest_id")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input id="invoice_date" label={t("finance.invoices.invoiceDate")} type="date" {...creg("invoice_date")} />
            <Input id="due_date" label={t("finance.invoices.dueDate")} type="date" {...creg("due_date")} />
          </div>
          <Input id="notes" label={t("finance.invoices.notes")} {...creg("notes")} />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setCreateModal(false)}>{t("finance.invoices.cancel")}</Button>
            <Button type="submit" disabled={createMutation.isPending}>{t("finance.invoices.create")}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!payModal} onClose={() => setPayModal(null)} title={t("finance.invoices.recordPayment")} size="sm">
        <form onSubmit={phs(onPay)} className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("finance.invoices.invoice")}: <strong>{payModal?.invoice_number}</strong><br />
            {t("finance.invoices.total")}: {formatCurrency(payModal?.total_amount ?? 0)} | {t("finance.invoices.paid")}: {formatCurrency(payModal?.paid_amount ?? 0)} | {t("finance.invoices.balance")}: {formatCurrency((payModal?.total_amount ?? 0) - (payModal?.paid_amount ?? 0))}
          </p>
          <input type="hidden" {...preg("invoice_id")} />
          <Input id="amount" label={t("finance.invoices.amount") + " *"} type="number" step="0.01" error={perrors.amount?.message} {...preg("amount", { valueAsNumber: true })} />
          <Input id="payment_method" label={t("finance.invoices.paymentMethod") + " *"} error={perrors.payment_method?.message} {...preg("payment_method")} />
          <Input id="reference" label={t("finance.invoices.reference")} {...preg("reference")} />
          <Input id="notes" label={t("finance.invoices.notes")} {...preg("notes")} />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setPayModal(null)}>{t("finance.invoices.cancel")}</Button>
            <Button type="submit" variant="success" disabled={payMutation.isPending}>{t("finance.invoices.savePayment")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
