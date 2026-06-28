import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, ChevronDown, ChevronRight, Building2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import {
  getServices,
  createService as createServiceApi,
  updateService as updateServiceApi,
  getHotelServices,
  createHotelService as createHotelServiceApi,
  updateHotelService as updateHotelServiceApi,
  deleteHotelService as deleteHotelServiceApi,
} from "@/api/modules/services"
import { getHotels } from "@/api/modules/hotels"
import type {
  Service,
  ServiceCreateRequest,
  ServiceUpdateRequest,
  HotelService,
  HotelServiceCreateRequest,
  HotelServiceUpdateRequest,
} from "@/types/service"
import { formatCurrency, cn } from "@/lib/utils"
import { extractItems } from "@/lib/form"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

export function ServicesPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId } = useScope()
  const queryClient = useQueryClient()
  const [serviceModal, setServiceModal] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [hotelSvcModal, setHotelSvcModal] = useState(false)
  const [editingHotelSvc, setEditingHotelSvc] = useState<HotelService | null>(null)
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())

  const serviceSchema = z.object({
    name: z.string().min(1, t("services.nameRequired")),
    code: z.string().min(1, t("services.codeRequired")),
    description: z.string().optional(),
    category: z.string().min(1, t("services.categoryRequired")),
  })

  type ServiceForm = z.infer<typeof serviceSchema>

  const hotelServiceSchema = z.object({
    hotel_id: z.string().min(1, t("services.hotelRequired")),
    service_id: z.string().min(1, t("services.serviceRequired")),
    price: z.number().min(0, t("services.priceNonNegative")),
  })

  type HotelServiceForm = z.infer<typeof hotelServiceSchema>

  const { data: svcData, isLoading: svcLoading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: () => getServices(),
  })

  const { data: hotelSvcData, isLoading: hotelSvcLoading } = useQuery<HotelService[]>({
    queryKey: ["hotel-services"],
    queryFn: () => getHotelServices(scopeMerge()),
  })

  const { data: hotelsData } = useQuery({
    queryKey: ["hotels", "select"],
    queryFn: () => getHotels({ page_size: "200" }),
  })

  const createServiceMutation = useMutation({
    mutationFn: (data: ServiceCreateRequest) => createServiceApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] })
      setServiceModal(false)
    },
  })

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ServiceUpdateRequest }) =>
      updateServiceApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] })
      setServiceModal(false)
      setEditingService(null)
    },
  })

  const createHotelSvcMutation = useMutation({
    mutationFn: (data: HotelServiceCreateRequest) => createHotelServiceApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-services"] })
      setHotelSvcModal(false)
    },
  })

  const updateHotelSvcMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: HotelServiceUpdateRequest }) =>
      updateHotelServiceApi(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-services"] })
      setHotelSvcModal(false)
      setEditingHotelSvc(null)
    },
  })

  const deleteHotelSvcMutation = useMutation({
    mutationFn: deleteHotelServiceApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hotel-services"] }),
  })

  const {
    register: reg,
    handleSubmit: hs,
    reset: rs,
    formState: { errors: svcErrors },
  } = useForm<ServiceForm>({ resolver: zodResolver(serviceSchema) })

  const {
    register: hreg,
    handleSubmit: hhs,
    reset: hrs,
    formState: { errors: hsvcErrors },
  } = useForm<HotelServiceForm>({ resolver: zodResolver(hotelServiceSchema) })

  const openServiceCreate = () => {
    rs({ name: "", code: "", category: "" })
    setEditingService(null)
    setServiceModal(true)
  }

  const openServiceEdit = (svc: Service) => {
    rs({ name: svc.name, code: svc.code, description: svc.description || "", category: svc.category })
    setEditingService(svc)
    setServiceModal(true)
  }

  const openHotelSvcCreate = (hId?: string) => {
    hrs({ hotel_id: hId || hotelId || "", service_id: "", price: 0 })
    setEditingHotelSvc(null)
    setHotelSvcModal(true)
  }

  const openHotelSvcEdit = (hs: HotelService) => {
    hrs({ hotel_id: hs.hotel_id, service_id: hs.service_id, price: hs.price })
    setEditingHotelSvc(hs)
    setHotelSvcModal(true)
  }

  const onServiceSubmit = (values: ServiceForm) => {
    if (editingService) {
      updateServiceMutation.mutate({
        id: editingService.id,
        data: values as ServiceUpdateRequest,
      })
    } else {
      createServiceMutation.mutate(values as ServiceCreateRequest)
    }
  }

  const onHotelSvcSubmit = (values: HotelServiceForm) => {
    if (editingHotelSvc) {
      updateHotelSvcMutation.mutate({
        id: editingHotelSvc.id,
        data: { price: values.price },
      })
    } else {
      createHotelSvcMutation.mutate(values as HotelServiceCreateRequest)
    }
  }

  const services = extractItems<Service>(svcData)
  const hotelServicesRaw = extractItems<HotelService>(hotelSvcData)
  const hotelServices = isSuperAdmin ? hotelServicesRaw : hotelServicesRaw.filter((hs) => hs.hotel_id === hotelId)

  const hotelsList = useMemo(() => {
    const raw = (hotelsData as any)?.items ?? (Array.isArray(hotelsData) ? hotelsData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [hotelsData])

  const hotelOptions = useMemo(
    () => hotelsList.map((h: any) => ({ value: h.id, label: h.name })),
    [hotelsList]
  )

  const hotelTree = useMemo(() => {
    if (!isSuperAdmin) return []
    return hotelsList
      .map((hotel: any) => {
        const hotelSvcs = hotelServices.filter((hs) => hs.hotel_id === hotel.id)
        return { hotel, services: hotelSvcs }
      })
      .filter((item) => item.services.length > 0)
  }, [hotelsList, hotelServices, isSuperAdmin])

  const toggleHotel = (id: string) => {
    setExpandedHotels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const serviceColumns: Column<Service>[] = [
    { key: "name", header: t("services.name") },
    { key: "code", header: t("services.code") },
    { key: "category", header: t("services.category") },
    {
      key: "is_active",
      header: t("services.active"),
      render: (s) => <Badge variant={s.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      key: "actions",
      header: "",
      render: (s) => (
        <Button variant="ghost" size="sm" onClick={() => openServiceEdit(s)}>
          {t("services.edit")}
        </Button>
      ),
    },
  ]

  const hotelSvcColumns: Column<HotelService>[] = [
    {
      key: "service",
      header: t("services.service"),
      render: (hs) => hs.service?.name || t("services.na"),
    },
    {
      key: "price",
      header: t("services.price"),
      render: (hs) => formatCurrency(hs.price),
    },
    {
      key: "is_active",
      header: t("services.active"),
      render: (hs) => <Badge variant={hs.is_active ? "ACTIVE" : "INACTIVE"} />,
    },
    {
      key: "actions",
      header: "",
      render: (hs) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => openHotelSvcEdit(hs)}>
            {t("services.edit")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600"
            onClick={() => {
              if (confirm(t("services.deleteConfirm"))) deleteHotelSvcMutation.mutate(hs.id)
            }}
          >
            {t("services.delete")}
          </Button>
        </div>
      ),
    },
  ]

  if (svcLoading || hotelSvcLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("services.title")}</h1>
        <p className="text-gray-500 mt-1">{t("services.subtitle")}</p>
      </div>

      <div className={cn("grid gap-6", isSuperAdmin ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
        <Card>
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">{t("services.globalServices")}</h3>
            <Button size="sm" onClick={openServiceCreate}>
              <Plus className="h-4 w-4" />
              {t("services.add")}
            </Button>
          </div>
          <CardContent className="pt-6">
            <DataTable
              columns={serviceColumns}
              data={services}
              keyField="id"
              emptyMessage={t("services.noServices")}
            />
          </CardContent>
        </Card>

        {isSuperAdmin ? (
          <Card>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{t("services.hotelServices")}</h3>
              <Button size="sm" onClick={() => openHotelSvcCreate()}>
                <Plus className="h-4 w-4" />
                {t("services.add")}
              </Button>
            </div>
            <CardContent className="pt-4">
              {hotelTree.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  {t("services.noHotelServices")}
                </div>
              ) : (
                <div className="space-y-2">
                  {hotelTree.map(({ hotel, services: hotelSvcs }) => {
                    const isExpanded = expandedHotels.has(hotel.id)

                    return (
                      <div key={hotel.id} className="border border-gray-200 rounded-lg">
                        <button
                          onClick={() => toggleHotel(hotel.id)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors rounded-lg text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                          )}
                          <Building2 className="h-4 w-4 text-primary-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-gray-900">{hotel.name}</span>
                            {hotel.code && (
                              <span className="text-xs text-gray-400 ml-2">({hotel.code})</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">
                            {hotelSvcs.length} {t("services.services", "services")}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!isExpanded) toggleHotel(hotel.id)
                              openHotelSvcCreate(hotel.id)
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-gray-100 p-2">
                            <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-medium text-gray-400 uppercase border-b border-gray-100">
                              <span className="col-span-4">{t("services.service")}</span>
                              <span className="col-span-2">{t("services.price")}</span>
                              <span className="col-span-2">{t("services.active")}</span>
                              <span className="col-span-4" />
                            </div>
                            {hotelSvcs.map((hs) => (
                              <div
                                key={hs.id}
                                className="grid grid-cols-12 gap-2 px-3 py-2 rounded-md items-center hover:bg-gray-50 transition-colors"
                              >
                                <span className="col-span-4 text-sm text-gray-900">
                                  {hs.service?.name || t("services.na")}
                                </span>
                                <span className="col-span-2 text-sm font-medium text-gray-900">
                                  {formatCurrency(hs.price)}
                                </span>
                                <span className="col-span-2">
                                  <Badge variant={hs.is_active ? "ACTIVE" : "INACTIVE"} />
                                </span>
                                <span className="col-span-4 flex gap-1 justify-end">
                                  <Button variant="ghost" size="sm" onClick={() => openHotelSvcEdit(hs)}>
                                    {t("services.edit")}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600"
                                    onClick={() => {
                                      if (confirm(t("services.deleteConfirm")))
                                        deleteHotelSvcMutation.mutate(hs.id)
                                    }}
                                  >
                                    {t("services.delete")}
                                  </Button>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{t("services.hotelServices")}</h3>
              <Button size="sm" onClick={() => openHotelSvcCreate()}>
                <Plus className="h-4 w-4" />
                {t("services.add")}
              </Button>
            </div>
            <CardContent className="pt-6">
              <DataTable
                columns={hotelSvcColumns}
                data={hotelServices}
                keyField="id"
                emptyMessage={t("services.noHotelServices")}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <Modal
        open={serviceModal}
        onClose={() => { setServiceModal(false); setEditingService(null) }}
        title={editingService ? t("services.editService") : t("services.createService")}
      >
        <form onSubmit={hs(onServiceSubmit)} className="space-y-4">
          <Input id="name" label={t("services.name") + " *"} error={svcErrors.name?.message} {...reg("name")} />
          <Input id="code" label={t("services.code") + " *"} error={svcErrors.code?.message} {...reg("code")} />
          <Input
            id="category"
            label={t("services.category") + " *"}
            placeholder={t("services.categoryPlaceholder")}
            error={svcErrors.category?.message}
            {...reg("category")}
          />
          <Input id="description" label={t("services.description")} {...reg("description")} />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setServiceModal(false)}>
              {t("services.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
            >
              {editingService ? t("services.update") : t("services.create")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={hotelSvcModal}
        onClose={() => { setHotelSvcModal(false); setEditingHotelSvc(null) }}
        title={editingHotelSvc ? t("services.editHotelService") : t("services.addHotelService")}
      >
        <form onSubmit={hhs(onHotelSvcSubmit)} className="space-y-4">
          {isSuperAdmin ? (
            <Select
              id="hotel_id"
              label={t("services.hotelId") + " *"}
              options={hotelOptions}
              placeholder={t("services.selectHotel", "Select hotel")}
              error={hsvcErrors.hotel_id?.message}
              {...hreg("hotel_id")}
            />
          ) : (
            <Input
              id="hotel_id"
              label={t("services.hotelId") + " *"}
              placeholder={t("services.uuid")}
              error={hsvcErrors.hotel_id?.message}
              disabled
              {...hreg("hotel_id")}
            />
          )}
          <Select
            id="service_id"
            label={t("services.serviceId") + " *"}
            options={services.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
            placeholder={t("services.selectService", "Select service")}
            error={hsvcErrors.service_id?.message}
            {...hreg("service_id")}
          />
          <Input
            id="price"
            label={t("services.price") + " *"}
            type="number"
            step="0.01"
            error={hsvcErrors.price?.message}
            {...hreg("price", { valueAsNumber: true })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setHotelSvcModal(false)}>
              {t("services.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createHotelSvcMutation.isPending || updateHotelSvcMutation.isPending}
            >
              {editingHotelSvc ? t("services.update") : t("services.create")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
