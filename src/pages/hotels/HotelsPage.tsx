import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
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
  getHotels,
  createHotel,
  updateHotel,
  updateHotelStatus,
  deleteHotel,
} from "@/api/modules/hotels"
import { getBranches } from "@/api/modules/branches"
import type { Hotel, HotelCreateRequest, HotelUpdateRequest } from "@/types/hotel"
import type { Branch } from "@/types/branch"
import { formatDate } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

export function HotelsPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId, canManageHotel } = useScope()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null)
  const [statusModal, setStatusModal] = useState<Hotel | null>(null)
  const [branchesHotel, setBranchesHotel] = useState<Hotel | null>(null)

  const hotelSchema = z.object({
    name: z.string().min(1, t("hotels.nameRequired")),
    code: z
      .string()
      .min(2, t("hotels.codeMin"))
      .max(10, t("hotels.codeMax"))
      .regex(/^[A-Z0-9]+$/, t("hotels.codeUppercase")),
    stars: z.number().min(1).max(5),
    description: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email(t("hotels.invalidEmail")).optional().or(z.literal("")),
    address_line1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional(),
  })

  type HotelForm = z.infer<typeof hotelSchema>

  const { data, isLoading } = useQuery({
    queryKey: ["hotels", search, page],
    queryFn: () => {
      const params = scopeMerge({ page: String(page), page_size: "10" })
      if (search) params.search = search
      return getHotels(params)
    },
  })

  const hotels: Hotel[] = Array.isArray(data) ? data : ((data as any)?.data ?? (data as any)?.items) ?? []
  const filteredHotels = isSuperAdmin ? hotels : hotels.filter((h) => h.id === hotelId)
  const paginationData =
    data && !Array.isArray(data) && (data as any)?.total_pages
      ? {
          page: (data as any).page,
          totalPages: (data as any).total_pages,
          total: (data as any).total,
          onPageChange: setPage,
        }
      : undefined

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => getBranches(scopeMerge()),
  })
  const allBranches: Branch[] = Array.isArray(branchesData) ? branchesData : (branchesData as any)?.items ?? []

  const createMutation = useMutation({
    mutationFn: createHotel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] })
      setModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: HotelUpdateRequest }) =>
      updateHotel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] })
      setModalOpen(false)
      setEditingHotel(null)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateHotelStatus(id, { status: status as "ACTIVE" | "SUSPENDED" | "CLOSED" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] })
      setStatusModal(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteHotel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] })
      queryClient.invalidateQueries({ queryKey: ["branches"] })
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HotelForm>({
    resolver: zodResolver(hotelSchema),
  })

  const openCreate = () => {
    reset({
      name: "",
      code: "",
      stars: 3,
    })
    setEditingHotel(null)
    setModalOpen(true)
  }

  const openEdit = (hotel: Hotel) => {
    reset({
      name: hotel.name,
      code: hotel.code,
      stars: hotel.stars,
      description: hotel.description || "",
      phone: hotel.phone || "",
      email: hotel.email || "",
      address_line1: hotel.address_line1 || "",
      city: hotel.city || "",
      state: hotel.state || "",
      country: hotel.country || "",
      postal_code: hotel.postal_code || "",
    })
    setEditingHotel(hotel)
    setModalOpen(true)
  }

  const onSubmit = (values: HotelForm) => {
    if (editingHotel) {
      const { code, ...updateData } = values
      updateMutation.mutate({ id: editingHotel.id, data: updateData })
    } else {
      createMutation.mutate(values as HotelCreateRequest)
    }
  }

  const columns: Column<Hotel>[] = [
    { key: "name", header: t("hotels.name") },
    { key: "code", header: t("hotels.code") },
    {
      key: "stars",
      header: t("hotels.stars"),
      render: (h) => "★".repeat(h.stars),
    },
    {
      key: "city",
      header: t("hotels.city"),
      render: (h) => h.city || "-",
    },
    {
      key: "status",
      header: t("hotels.status"),
      render: (h) =>
        canManageHotel(h.id) ? (
          <button
            onClick={(e) => { e.stopPropagation(); setStatusModal(h) }}
            title={t("hotels.changeStatus")}
            className="hover:opacity-80 transition-opacity"
          >
            <Badge variant={h.status} />
          </button>
        ) : (
          <Badge variant={h.status} />
        ),
    },
    {
      key: "branches",
      header: t("hotels.branches"),
      render: (h) => {
        const count = allBranches.filter((b) => b.hotel_id === h.id).length
        return (
          <button
            onClick={(e) => { e.stopPropagation(); setBranchesHotel(h) }}
            className="text-primary-600 hover:text-primary-800 font-medium"
          >
            {count}
          </button>
        )
      },
    },
    {
      key: "created_at",
      header: t("hotels.created"),
      render: (h) => formatDate(h.created_at),
    },
    {
      key: "actions",
      header: "",
      render: (h) =>
        canManageHotel(h.id) ? (
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(h) }}>
              {t("hotels.edit")}
            </Button>
            {isSuperAdmin && (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600"
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(t("hotels.deleteConfirm", { name: h.name }))) {
                    deleteMutation.mutate(h.id)
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                {t("hotels.delete")}
              </Button>
            )}
          </div>
        ) : null,
    },
  ]

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("hotels.title")}</h1>
          <p className="text-gray-500 mt-1">{t("hotels.subtitle")}</p>
        </div>
        {isSuperAdmin && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("hotels.addHotel")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredHotels}
            keyField="id"
            isLoading={isLoading}
            searchable
            searchPlaceholder={t("hotels.searchPlaceholder")}
            onSearch={setSearch}
            pagination={paginationData}
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingHotel(null) }}
        title={editingHotel ? t("hotels.editHotel") : t("hotels.createHotel")}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input id="name" label={t("hotels.name") + " *"} error={errors.name?.message} {...register("name")} />
            {!editingHotel && (
              <Input id="code" label={t("hotels.code") + " *"} placeholder="e.g. HOTEL01" error={errors.code?.message} {...register("code")} />
            )}
          </div>
          <Select id="stars" label={t("hotels.stars")} options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} ${t("hotels.stars")}` }))} {...register("stars", { valueAsNumber: true })} />
          <Input id="description" label={t("hotels.description")} error={errors.description?.message} {...register("description")} />
          <div className="grid grid-cols-2 gap-4">
            <Input id="phone" label={t("hotels.phone")} error={errors.phone?.message} {...register("phone")} />
            <Input id="email" label={t("hotels.email")} error={errors.email?.message} {...register("email")} />
          </div>
          <Input id="address_line1" label={t("hotels.address")} error={errors.address_line1?.message} {...register("address_line1")} />
          <div className="grid grid-cols-2 gap-4">
            <Input id="city" label={t("hotels.city")} error={errors.city?.message} {...register("city")} />
            <Input id="state" label={t("hotels.state")} error={errors.state?.message} {...register("state")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input id="country" label={t("hotels.country")} error={errors.country?.message} {...register("country")} />
            <Input id="postal_code" label={t("hotels.postalCode")} error={errors.postal_code?.message} {...register("postal_code")} />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>{t("hotels.cancel")}</Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingHotel ? t("hotels.update") : t("hotels.create")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title={`Status: ${statusModal?.name}`} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">{t("hotels.currentStatus")}: <Badge variant={statusModal?.status || "ACTIVE"} /></p>
          <div className="flex gap-2">
            {[
              { value: "ACTIVE", label: t("status.ACTIVE") },
              { value: "SUSPENDED", label: t("status.SUSPENDED") },
              { value: "CLOSED", label: t("status.CLOSED") },
            ].map((s) => (
              <Button
                key={s.value}
                variant={statusModal?.status === s.value ? "primary" : "outline"}
                size="sm"
                onClick={() => statusMutation.mutate({ id: statusModal!.id, status: s.value })}
                disabled={statusMutation.isPending}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={!!branchesHotel} onClose={() => setBranchesHotel(null)}
        title={branchesHotel ? `${t("hotels.branchesModal")}: ${branchesHotel.name}` : t("hotels.branchesModal")} size="md">
        <div className="space-y-3">
          {(() => {
            const hotelBranches = allBranches.filter((b) => b.hotel_id === branchesHotel?.id)
            if (hotelBranches.length === 0) return <p className="text-sm text-gray-500">{t("hotels.noBranches")}</p>
            return (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{t("hotels.name")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{t("hotels.code")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{t("hotels.city")}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{t("hotels.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {hotelBranches.map((b) => (
                    <tr key={b.id}>
                      <td className="px-3 py-2">{b.name}</td>
                      <td className="px-3 py-2">{b.code}</td>
                      <td className="px-3 py-2">{b.city || "-"}</td>
                      <td className="px-3 py-2"><Badge variant={b.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          })()}
        </div>
      </Modal>
    </div>
  )
}
