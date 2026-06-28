import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown, ChevronRight, Search, X, Building2, BookOpen } from "lucide-react"
import {
  Badge,
  Card,
  CardContent,
  DataTable,
  Input,
  PageLoader,
} from "@/components/ui"
import type { Column } from "@/components/ui"
import { getLedgers } from "@/api/modules/finance"
import { getHotels } from "@/api/modules/hotels"
import type { Ledger } from "@/types/finance"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

export function LedgerPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId } = useScope()
  const [search, setSearch] = useState("")
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())

  const { data, isLoading } = useQuery({
    queryKey: ["ledgers", search],
    queryFn: () => getLedgers(scopeMerge({ search })),
  })

  const { data: hotelsData } = useQuery({
    queryKey: ["hotels", "select"],
    queryFn: () => getHotels({ page_size: "200" }),
    enabled: isSuperAdmin,
  })

  const ledgers: Ledger[] = data?.items ?? (Array.isArray(data) ? data : [])
  const filteredLedgers = isSuperAdmin ? ledgers : ledgers.filter((l) => l.hotel_id === hotelId)

  const hotelsList = useMemo(() => {
    const raw = (hotelsData as any)?.items ?? (Array.isArray(hotelsData) ? hotelsData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [hotelsData])

  const q = search.toLowerCase().trim()

  const hotelTree = useMemo(() => {
    if (!isSuperAdmin) return []
    return hotelsList
      .map((hotel: any) => {
        let hotelLedgers = ledgers.filter((l) => l.hotel_id === hotel.id)
        if (q) {
          hotelLedgers = hotelLedgers.filter(
            (l) => l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
          )
          if (hotelLedgers.length === 0 && !hotel.name.toLowerCase().includes(q)) return null
        }
        return { hotel, ledgers: hotelLedgers }
      })
      .filter(Boolean) as { hotel: any; ledgers: Ledger[] }[]
  }, [hotelsList, ledgers, q, isSuperAdmin])

  const toggleHotel = (id: string) => {
    setExpandedHotels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const columns: Column<Ledger>[] = [
    { key: "code", header: t("finance.ledger.code") },
    { key: "name", header: t("finance.ledger.name") },
    { key: "type", header: t("finance.ledger.type"), render: (l) => <Badge variant={l.type} /> },
    { key: "is_active", header: t("finance.ledger.active"), render: (l) => <Badge variant={l.is_active ? "ACTIVE" : "INACTIVE"} /> },
  ]

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("finance.ledger.title")}</h1>
        <p className="text-gray-500 mt-1">{t("finance.ledger.subtitle")}</p>
      </div>

      {isSuperAdmin ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("finance.ledger.searchPlaceholder")} className="pl-10" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
          </div>

          <div className="space-y-2">
            {hotelTree.map(({ hotel, ledgers: hotelLedgers }) => {
              const isExpanded = expandedHotels.has(hotel.id)
              const activeCount = hotelLedgers.filter((l) => l.is_active).length

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
                      {hotelLedgers.length} {t("finance.ledger.title")} ({activeCount} {t("finance.ledger.active")})
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {hotelLedgers.length === 0 ? (
                        <div className="p-4 text-sm text-gray-400 text-center">{t("finance.ledger.noLedgers", "No ledgers")}</div>
                      ) : (
                        <div className="p-2">
                          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-medium text-gray-400 uppercase border-b border-gray-100">
                            <span className="col-span-3">{t("finance.ledger.code")}</span>
                            <span className="col-span-4">{t("finance.ledger.name")}</span>
                            <span className="col-span-2">{t("finance.ledger.type")}</span>
                            <span className="col-span-3">{t("finance.ledger.active")}</span>
                          </div>
                          {hotelLedgers.map((l) => (
                            <div key={l.id} className={cn("grid grid-cols-12 gap-2 px-3 py-2 rounded-md items-center hover:bg-gray-50 transition-colors")}>
                              <span className="col-span-3 text-sm font-mono text-gray-700">{l.code}</span>
                              <span className="col-span-4 text-sm text-gray-900">{l.name}</span>
                              <span className="col-span-2"><Badge variant={l.type} /></span>
                              <span className="col-span-3"><Badge variant={l.is_active ? "ACTIVE" : "INACTIVE"} /></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
            {hotelTree.length === 0 && ledgers.length > 0 && (
              <div className="text-center py-12 text-gray-400"><BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>{t("finance.ledger.noLedgers", "No ledgers found")}</p></div>
            )}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <DataTable columns={columns} data={filteredLedgers} keyField="id" isLoading={isLoading} searchable searchPlaceholder={t("finance.ledger.searchPlaceholder")} onSearch={setSearch} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
