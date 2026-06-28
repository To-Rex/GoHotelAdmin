import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronRight, Search, X, Building2, CreditCard } from "lucide-react"
import {
  Badge,
  Card,
  CardContent,
  DataTable,
  Input,
  PageLoader,
} from "@/components/ui"
import type { Column } from "@/components/ui"
import { getPayments } from "@/api/modules/finance"
import { getHotels } from "@/api/modules/hotels"
import type { Payment } from "@/types/finance"
import { formatDate, formatCurrency, cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

export function PaymentsPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId } = useScope()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ["payments", search, page],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), page_size: "10" }
      if (search) params.search = search
      return getPayments(scopeMerge(params))
    },
  })

  const { data: hotelsData } = useQuery({
    queryKey: ["hotels", "select"],
    queryFn: () => getHotels({ page_size: "200" }),
    enabled: isSuperAdmin,
  })

  const { data: allPaymentsData } = useQuery({
    queryKey: ["payments", "all"],
    queryFn: () => getPayments(scopeMerge({ page_size: "2000" })),
    enabled: isSuperAdmin,
  })

  const allPayments: Payment[] = useMemo(
    () => (Array.isArray(allPaymentsData) ? allPaymentsData : (allPaymentsData as any)?.items ?? []),
    [allPaymentsData]
  )

  const hotelsList = useMemo(() => {
    const raw = (hotelsData as any)?.items ?? (Array.isArray(hotelsData) ? hotelsData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [hotelsData])

  const payments = Array.isArray(data) ? data : (data as any)?.items ?? []
  const filteredPayments = isSuperAdmin ? payments : payments.filter((p: Payment) => p.hotel_id === hotelId)
  const paginationData =
    data && !Array.isArray(data) && (data as any)?.total_pages
      ? { page: (data as any).page, totalPages: (data as any).total_pages, total: (data as any).total, onPageChange: setPage }
      : undefined

  const q = search.toLowerCase().trim()

  const hotelTree = useMemo(() => {
    if (!isSuperAdmin) return []
    return hotelsList
      .map((hotel: any) => {
        let pays = allPayments.filter((p) => p.hotel_id === hotel.id)
        if (q) {
          pays = pays.filter(
            (p) =>
              p.payment_number?.toLowerCase().includes(q) ||
              p.reference?.toLowerCase().includes(q)
          )
          if (pays.length === 0 && !hotel.name.toLowerCase().includes(q)) return null
        }
        return { hotel, payments: pays }
      })
      .filter(Boolean) as { hotel: any; payments: Payment[] }[]
  }, [hotelsList, allPayments, q, isSuperAdmin])

  const toggleHotel = (id: string) => {
    setExpandedHotels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const columns: Column<Payment>[] = [
    { key: "payment_number", header: t("finance.payments.paymentNumber") },
    { key: "payment_date", header: t("finance.payments.date"), render: (p) => formatDate(p.payment_date) },
    { key: "amount", header: t("finance.payments.amount"), render: (p) => formatCurrency(p.amount) },
    { key: "payment_method", header: t("finance.payments.method"), render: (p) => <Badge variant={p.payment_method} /> },
    { key: "reference", header: t("finance.payments.reference"), render: (p) => p.reference || "-" },
    { key: "created_at", header: t("finance.payments.created"), render: (p) => formatDate(p.created_at) },
  ]

  if (isLoading && !isSuperAdmin) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("finance.payments.title")}</h1>
        <p className="text-gray-500 mt-1">{t("finance.payments.subtitle")}</p>
      </div>

      {isSuperAdmin ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("finance.payments.searchPlaceholder")} className="pl-10" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
          </div>

          <div className="space-y-2">
            {hotelTree.map(({ hotel, payments: hotelPays }) => {
              const isExpanded = expandedHotels.has(hotel.id)
              const totalAmount = hotelPays.reduce((sum, p) => sum + p.amount, 0)

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
                      {hotelPays.length} {t("finance.payments.title")} | {formatCurrency(totalAmount)}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {hotelPays.length === 0 ? (
                        <div className="p-4 text-sm text-gray-400 text-center">{t("finance.payments.noPayments", "No payments")}</div>
                      ) : (
                        <div className="p-2">
                          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-medium text-gray-400 uppercase border-b border-gray-100">
                            <span className="col-span-2">{t("finance.payments.paymentNumber")}</span>
                            <span className="col-span-2">{t("finance.payments.date")}</span>
                            <span className="col-span-2">{t("finance.payments.amount")}</span>
                            <span className="col-span-2">{t("finance.payments.method")}</span>
                            <span className="col-span-2">{t("finance.payments.reference")}</span>
                            <span className="col-span-2">{t("finance.payments.created")}</span>
                          </div>
                          {hotelPays.map((p) => (
                            <div key={p.id} className={cn("grid grid-cols-12 gap-2 px-3 py-2 rounded-md items-center hover:bg-gray-50 transition-colors")}>
                              <span className="col-span-2 font-medium text-gray-900 text-sm truncate">{p.payment_number}</span>
                              <span className="col-span-2 text-xs text-gray-500">{formatDate(p.payment_date)}</span>
                              <span className="col-span-2 text-sm font-medium text-gray-900">{formatCurrency(p.amount)}</span>
                              <span className="col-span-2"><Badge variant={p.payment_method} /></span>
                              <span className="col-span-2 text-sm text-gray-600 truncate">{p.reference || "-"}</span>
                              <span className="col-span-2 text-xs text-gray-500">{formatDate(p.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
            {hotelTree.length === 0 && allPayments.length > 0 && (
              <div className="text-center py-12 text-gray-400"><CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>{t("finance.payments.noPayments", "No payments found")}</p></div>
            )}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <DataTable columns={columns} data={filteredPayments} keyField="id" isLoading={isLoading} searchable searchPlaceholder={t("finance.payments.searchPlaceholder")} onSearch={setSearch} pagination={paginationData} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
