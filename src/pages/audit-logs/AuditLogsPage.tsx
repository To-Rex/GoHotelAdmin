import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronRight, Search, X, Building2, ScrollText } from "lucide-react"
import {
  Card,
  CardContent,
  DataTable,
  Input,
  PageLoader,
} from "@/components/ui"
import type { Column } from "@/components/ui"
import { getAuditLogs } from "@/api/modules/reports"
import { getHotels } from "@/api/modules/hotels"
import type { AuditLog } from "@/types/other"
import { formatDateTime, cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

export function AuditLogsPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId } = useScope()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", search, page],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), page_size: "20" }
      if (search) params.search = search
      return getAuditLogs(scopeMerge(params))
    },
  })

  const { data: hotelsData } = useQuery({
    queryKey: ["hotels", "select"],
    queryFn: () => getHotels({ page_size: "200" }),
    enabled: isSuperAdmin,
  })

  const { data: allLogsData } = useQuery({
    queryKey: ["audit-logs", "all"],
    queryFn: () => getAuditLogs(scopeMerge({ page_size: "2000" })),
    enabled: isSuperAdmin,
  })

  const allLogs: AuditLog[] = useMemo(
    () => (Array.isArray(allLogsData) ? allLogsData : (allLogsData as any)?.items ?? []),
    [allLogsData]
  )

  const hotelsList = useMemo(() => {
    const raw = (hotelsData as any)?.items ?? (Array.isArray(hotelsData) ? hotelsData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [hotelsData])

  const logs = Array.isArray(data) ? data : (data as any)?.items ?? []
  const filteredLogs = isSuperAdmin ? logs : logs.filter((l: AuditLog) => l.hotel_id === hotelId)
  const paginationData =
    data && !Array.isArray(data) && (data as any)?.total_pages
      ? { page: (data as any).page, totalPages: (data as any).total_pages, total: (data as any).total, onPageChange: setPage }
      : undefined

  const q = search.toLowerCase().trim()

  const hotelTree = useMemo(() => {
    if (!isSuperAdmin) return []
    return hotelsList
      .map((hotel: any) => {
        let hotelLogs = allLogs.filter((l) => l.hotel_id === hotel.id)
        if (q) {
          hotelLogs = hotelLogs.filter(
            (l) =>
              l.action.toLowerCase().includes(q) ||
              l.entity_type.toLowerCase().includes(q) ||
              l.user?.first_name?.toLowerCase().includes(q) ||
              l.user?.last_name?.toLowerCase().includes(q)
          )
          if (hotelLogs.length === 0 && !hotel.name.toLowerCase().includes(q)) return null
        }
        return { hotel, logs: hotelLogs }
      })
      .filter(Boolean) as { hotel: any; logs: AuditLog[] }[]
  }, [hotelsList, allLogs, q, isSuperAdmin])

  const toggleHotel = (id: string) => {
    setExpandedHotels((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  const columns: Column<AuditLog>[] = [
    { key: "action", header: t("auditLogs.action") },
    { key: "entity_type", header: t("auditLogs.entity") },
    { key: "user", header: t("auditLogs.user"), render: (l) => l.user ? `${l.user.first_name} ${l.user.last_name}` : t("auditLogs.system") },
    { key: "created_at", header: t("auditLogs.timestamp"), render: (l) => formatDateTime(l.created_at) },
  ]

  if (isLoading && !isSuperAdmin) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("auditLogs.title")}</h1>
        <p className="text-gray-500 mt-1">{t("auditLogs.subtitle")}</p>
      </div>

      {isSuperAdmin ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("auditLogs.searchPlaceholder")} className="pl-10" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
          </div>
          <div className="space-y-2">
            {hotelTree.map(({ hotel, logs: hotelLogs }) => {
              const isExpanded = expandedHotels.has(hotel.id)
              return (
                <Card key={hotel.id}>
                  <button onClick={() => toggleHotel(hotel.id)} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors rounded-lg text-left">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                    <Building2 className="h-5 w-5 text-primary-600 shrink-0" />
                    <div className="flex-1 min-w-0"><span className="font-semibold text-gray-900">{hotel.name}</span>{hotel.code && <span className="text-xs text-gray-400 ml-2">({hotel.code})</span>}</div>
                    <span className="text-xs text-gray-400 shrink-0">{hotelLogs.length} {t("auditLogs.title")}</span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {hotelLogs.length === 0 ? (
                        <div className="p-4 text-sm text-gray-400 text-center">{t("auditLogs.noLogs", "No audit logs")}</div>
                      ) : (
                        <div className="p-2">
                          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-medium text-gray-400 uppercase border-b border-gray-100">
                            <span className="col-span-3">{t("auditLogs.action")}</span>
                            <span className="col-span-2">{t("auditLogs.entity")}</span>
                            <span className="col-span-3">{t("auditLogs.user")}</span>
                            <span className="col-span-4">{t("auditLogs.timestamp")}</span>
                          </div>
                          {hotelLogs.map((l) => (
                            <div key={l.id} className={cn("grid grid-cols-12 gap-2 px-3 py-2 rounded-md items-center hover:bg-gray-50 transition-colors")}>
                              <span className="col-span-3 text-sm font-medium text-gray-900 truncate">{l.action}</span>
                              <span className="col-span-2 text-sm text-gray-600">{l.entity_type}</span>
                              <span className="col-span-3 text-sm text-gray-600 truncate">{l.user ? `${l.user.first_name} ${l.user.last_name}` : t("auditLogs.system")}</span>
                              <span className="col-span-4 text-xs text-gray-500">{formatDateTime(l.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
            {hotelTree.length === 0 && allLogs.length > 0 && (
              <div className="text-center py-12 text-gray-400"><ScrollText className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>{t("auditLogs.noLogs", "No audit logs found")}</p></div>
            )}
          </div>
        </>
      ) : (
        <Card><CardContent className="pt-6"><DataTable columns={columns} data={filteredLogs} keyField="id" isLoading={isLoading} searchable searchPlaceholder={t("auditLogs.searchPlaceholder")} onSearch={setSearch} pagination={paginationData} /></CardContent></Card>
      )}
    </div>
  )
}
