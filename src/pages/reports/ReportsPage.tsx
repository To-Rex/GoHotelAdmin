import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, ChevronDown, ChevronRight, Search, X, Building2, FileText } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Button,
  Badge,
  Card,
  CardContent,
  DataTable,
  Modal,
  PageLoader,
  Input,
  Select,
} from "@/components/ui"
import type { Column } from "@/components/ui"
import { getReports, generateReport } from "@/api/modules/reports"
import { getHotels } from "@/api/modules/hotels"
import type { Report, ReportGenerateRequest } from "@/types/other"
import { formatDate, cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

export function ReportsPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId } = useScope()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())

  const reportSchema = z.object({
    hotel_id: z.string().min(1, t("reports.hotelRequired")),
    report_type: z.enum(["OCCUPANCY", "REVENUE"]),
    name: z.string().optional(),
  })

  type ReportForm = z.infer<typeof reportSchema>

  const { data, isLoading } = useQuery({
    queryKey: ["reports", search, page],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), page_size: "10" }
      if (search) params.search = search
      return getReports(scopeMerge(params))
    },
  })

  const { data: hotelsData } = useQuery({
    queryKey: ["hotels", "select"],
    queryFn: () => getHotels({ page_size: "200" }),
    enabled: isSuperAdmin,
  })

  const { data: allReportsData } = useQuery({
    queryKey: ["reports", "all"],
    queryFn: () => getReports(scopeMerge({ page_size: "2000" })),
    enabled: isSuperAdmin,
  })

  const allReports: Report[] = useMemo(
    () => (Array.isArray(allReportsData) ? allReportsData : (allReportsData as any)?.items ?? []),
    [allReportsData]
  )

  const hotelsList = useMemo(() => {
    const raw = (hotelsData as any)?.items ?? (Array.isArray(hotelsData) ? hotelsData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [hotelsData])

  const hotelOptions = useMemo(
    () => hotelsList.map((h: any) => ({ value: h.id, label: h.name })),
    [hotelsList]
  )

  const reports = Array.isArray(data) ? data : (data as any)?.items ?? []
  const filteredReports = isSuperAdmin ? reports : reports.filter((r: Report) => r.hotel_id === hotelId)
  const paginationData =
    data && !Array.isArray(data) && (data as any)?.total_pages
      ? { page: (data as any).page, totalPages: (data as any).total_pages, total: (data as any).total, onPageChange: setPage }
      : undefined

  const q = search.toLowerCase().trim()

  const hotelTree = useMemo(() => {
    if (!isSuperAdmin) return []
    return hotelsList
      .map((hotel: any) => {
        let reps = allReports.filter((r) => r.hotel_id === hotel.id)
        if (q) {
          reps = reps.filter((r) => r.name?.toLowerCase().includes(q))
          if (reps.length === 0 && !hotel.name.toLowerCase().includes(q)) return null
        }
        return { hotel, reports: reps }
      })
      .filter(Boolean) as { hotel: any; reports: Report[] }[]
  }, [hotelsList, allReports, q, isSuperAdmin])

  const toggleHotel = (id: string) => {
    setExpandedHotels((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  const generateMutation = useMutation({
    mutationFn: (values: ReportGenerateRequest) => generateReport(values),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["reports"] }); setModalOpen(false) },
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReportForm>({ resolver: zodResolver(reportSchema) })

  const openCreate = (hId?: string) => {
    reset({ hotel_id: hId || hotelId || "", report_type: "OCCUPANCY" })
    setModalOpen(true)
  }

  const onSubmit = (values: ReportForm) => {
    generateMutation.mutate(values as ReportGenerateRequest)
  }

  const columns: Column<Report>[] = [
    { key: "name", header: t("reports.name") },
    { key: "report_type", header: t("reports.type"), render: (r) => <Badge variant={r.report_type} /> },
    { key: "generated_at", header: t("reports.generated"), render: (r) => r.generated_at ? formatDate(r.generated_at) : "-" },
    { key: "created_at", header: t("reports.created"), render: (r) => formatDate(r.created_at) },
  ]

  if (isLoading && !isSuperAdmin) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">{t("reports.title")}</h1><p className="text-gray-500 mt-1">{t("reports.subtitle")}</p></div>
        <Button onClick={() => openCreate()}><Plus className="h-4 w-4" />{t("reports.generateReport")}</Button>
      </div>

      {isSuperAdmin ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("reports.searchPlaceholder")} className="pl-10" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>}
          </div>
          <div className="space-y-2">
            {hotelTree.map(({ hotel, reports: hotelReports }) => {
              const isExpanded = expandedHotels.has(hotel.id)
              return (
                <Card key={hotel.id}>
                  <button onClick={() => toggleHotel(hotel.id)} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors rounded-lg text-left">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                    <Building2 className="h-5 w-5 text-primary-600 shrink-0" />
                    <div className="flex-1 min-w-0"><span className="font-semibold text-gray-900">{hotel.name}</span>{hotel.code && <span className="text-xs text-gray-400 ml-2">({hotel.code})</span>}</div>
                    <span className="text-xs text-gray-400 shrink-0">{hotelReports.length} {t("reports.title")}</span>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); if (!isExpanded) toggleHotel(hotel.id); openCreate(hotel.id) }}><Plus className="h-3.5 w-3.5" /></Button>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {hotelReports.length === 0 ? (
                        <div className="p-4 text-sm text-gray-400 text-center">{t("reports.noReports", "No reports")}</div>
                      ) : (
                        <div className="p-2">
                          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-medium text-gray-400 uppercase border-b border-gray-100">
                            <span className="col-span-3">{t("reports.name")}</span>
                            <span className="col-span-3">{t("reports.type")}</span>
                            <span className="col-span-3">{t("reports.generated")}</span>
                            <span className="col-span-3">{t("reports.created")}</span>
                          </div>
                          {hotelReports.map((r) => (
                            <div key={r.id} className={cn("grid grid-cols-12 gap-2 px-3 py-2 rounded-md items-center hover:bg-gray-50 transition-colors")}>
                              <span className="col-span-3 text-sm text-gray-900">{r.name}</span>
                              <span className="col-span-3"><Badge variant={r.report_type} /></span>
                              <span className="col-span-3 text-xs text-gray-500">{r.generated_at ? formatDate(r.generated_at) : "-"}</span>
                              <span className="col-span-3 text-xs text-gray-500">{formatDate(r.created_at)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </>
      ) : (
        <Card><CardContent className="pt-6"><DataTable columns={columns} data={filteredReports} keyField="id" isLoading={isLoading} searchable searchPlaceholder={t("reports.searchPlaceholder")} onSearch={setSearch} pagination={paginationData} /></CardContent></Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("reports.generateReport")} size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isSuperAdmin ? (
            <Select id="hotel_id" label={t("reports.hotelId") + " *"} options={hotelOptions} placeholder={t("reports.selectHotel", "Select hotel")} error={errors.hotel_id?.message} {...register("hotel_id")} />
          ) : (
            <Input id="hotel_id" label={t("reports.hotelId") + " *"} placeholder={t("reports.uuid")} error={errors.hotel_id?.message} disabled {...register("hotel_id")} />
          )}
          <Select id="report_type" label={t("reports.reportType") + " *"} options={[{ value: "OCCUPANCY", label: t("reports.occupancy") }, { value: "REVENUE", label: t("reports.revenue") }]} {...register("report_type")} />
          <Input id="name" label={t("reports.reportName")} placeholder={t("reports.optional")} {...register("name")} />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>{t("reports.cancel")}</Button>
            <Button type="submit" disabled={generateMutation.isPending}>{t("reports.generate")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
