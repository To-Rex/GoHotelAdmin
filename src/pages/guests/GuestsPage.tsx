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
  Card,
  CardContent,
  DataTable,
  Modal,
  PageLoader,
} from "@/components/ui"
import type { Column } from "@/components/ui"
import {
  getGuests,
  createGuest,
  updateGuest,
  deleteGuest,
} from "@/api/modules/guests"
import { getHotels } from "@/api/modules/hotels"
import type { Guest, GuestCreateRequest, GuestUpdateRequest } from "@/types/guest"
import type { Hotel } from "@/types/hotel"
import { formatDate } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"
import { usePermissions } from "@/lib/permissions"

export function GuestsPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId } = useScope()
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)

  const guestSchema = z.object({
    hotel_id: z.string().min(1, t("guests.hotelRequired")),
    first_name: z.string().min(1, t("guests.firstNameRequired")),
    last_name: z.string().min(1, t("guests.lastNameRequired")),
    phone: z.string().optional(),
    email: z.string().email(t("guests.invalidEmail")).optional().or(z.literal("")),
    passport_number: z.string().optional(),
    nationality: z.string().optional(),
    birth_date: z.string().optional(),
    id_document_type: z.string().optional(),
    id_document_number: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
  })

  type GuestForm = z.infer<typeof guestSchema>

  const { data, isLoading } = useQuery({
    queryKey: ["guests", search, page],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), page_size: "20" }
      if (search) params.search = search
      return getGuests(scopeMerge(params))
    },
  })

  const { data: hotelsData } = useQuery({
    queryKey: ["hotels", "select"],
    queryFn: () => getHotels({ page_size: "100" }),
    enabled: isSuperAdmin,
  })

  const guests = Array.isArray(data) ? data : (data as any)?.items ?? []
  const filteredGuests = isSuperAdmin ? guests : guests.filter((g: Guest) => g.hotel_id === hotelId)
  const paginationData =
    data && !Array.isArray(data) && (data as any)?.total_pages
      ? {
          page: (data as any).page,
          totalPages: (data as any).total_pages,
          total: (data as any).total,
          onPageChange: setPage,
        }
      : undefined

  const createMutation = useMutation({
    mutationFn: (data: GuestCreateRequest) => createGuest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] })
      setModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: GuestUpdateRequest }) =>
      updateGuest(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["guests"] })
      setModalOpen(false)
      setEditingGuest(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGuest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guests"] }),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GuestForm>({
    resolver: zodResolver(guestSchema),
  })

  const openCreate = () => {
    createMutation.reset()
    updateMutation.reset()
    reset({ first_name: "", last_name: "", hotel_id: hotelId || "" })
    setEditingGuest(null)
    setModalOpen(true)
  }

  const openEdit = (guest: Guest) => {
    createMutation.reset()
    updateMutation.reset()
    reset({
      hotel_id: guest.hotel_id,
      first_name: guest.first_name,
      last_name: guest.last_name,
      phone: guest.phone || "",
      email: guest.email || "",
      passport_number: guest.passport_number || "",
      nationality: guest.nationality || "",
      birth_date: guest.birth_date || "",
      id_document_type: guest.id_document_type || "",
      id_document_number: guest.id_document_number || "",
      address: guest.address || "",
      notes: guest.notes || "",
    })
    setEditingGuest(guest)
    setModalOpen(true)
  }

  const onSubmit = (values: GuestForm) => {
    // drop empty optional fields — backend rejects "" for dates/emails
    const payload = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== "" && v !== undefined)
    ) as unknown
    if (editingGuest) {
      updateMutation.mutate({ id: editingGuest.id, data: payload as GuestUpdateRequest })
    } else {
      createMutation.mutate(payload as GuestCreateRequest)
    }
  }

  const mutationError = createMutation.error || updateMutation.error
  const rawDetail = (mutationError as any)?.response?.data?.detail
  const errorMessage = mutationError
    ? Array.isArray(rawDetail)
      ? rawDetail.map((d: any) => d?.msg ?? JSON.stringify(d)).join("; ")
      : (rawDetail ?? (mutationError as any)?.message ?? String(mutationError))
    : null

  const hotelsList: Hotel[] =
    hotelsData?.items ?? (Array.isArray(hotelsData) ? hotelsData : [])
  const hotelOptions = hotelsList.map((h: Hotel) => ({
    value: h.id,
    label: h.name,
  }))

  const columns: Column<Guest>[] = [
    {
      key: "name",
      header: t("guests.name"),
      render: (g) => `${g.first_name} ${g.last_name}`,
    },
    { key: "phone", header: t("guests.phone"), render: (g) => g.phone || "-" },
    { key: "email", header: t("guests.email"), render: (g) => g.email || "-" },
    { key: "nationality", header: t("guests.nationality"), render: (g) => g.nationality || "-" },
    { key: "created_at", header: t("guests.created"), render: (g) => formatDate(g.created_at) },
    {
      key: "actions",
      header: "",
      render: (g) => (
        <div className="flex gap-1">
          {can("guest.update") && (
            <Button variant="ghost" size="sm" onClick={() => openEdit(g)}>
              {t("guests.edit")}
            </Button>
          )}
          {can("guest.delete") && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600"
              onClick={() => {
                if (confirm(t("guests.deleteConfirm"))) deleteMutation.mutate(g.id)
              }}
            >
              {t("guests.delete")}
            </Button>
          )}
        </div>
      ),
    },
  ]

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("guests.title")}</h1>
          <p className="text-gray-500 mt-1">{t("guests.subtitle")}</p>
        </div>
        {can("guest.create") && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("guests.addGuest")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredGuests}
            keyField="id"
            isLoading={isLoading}
            searchable
            searchPlaceholder={t("guests.searchPlaceholder")}
            onSearch={setSearch}
            pagination={paginationData}
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingGuest(null) }}
        title={editingGuest ? t("guests.editGuest") : t("guests.createGuest")}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isSuperAdmin ? (
            <Select
              id="hotel_id"
              label={t("guests.hotelId") + " *"}
              options={hotelOptions}
              placeholder={t("rooms.selectHotel")}
              error={errors.hotel_id?.message}
              {...register("hotel_id")}
            />
          ) : (
            <Input
              id="hotel_id"
              label={t("guests.hotelId") + " *"}
              placeholder={t("guests.uuid")}
              error={errors.hotel_id?.message}
              disabled
              {...register("hotel_id")}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="first_name"
              label={t("guests.firstName") + " *"}
              error={errors.first_name?.message}
              {...register("first_name")}
            />
            <Input
              id="last_name"
              label={t("guests.lastName") + " *"}
              error={errors.last_name?.message}
              {...register("last_name")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input id="phone" label={t("guests.phone")} {...register("phone")} />
            <Input
              id="email"
              label={t("guests.email")}
              error={errors.email?.message}
              {...register("email")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input id="nationality" label={t("guests.nationality")} {...register("nationality")} />
            <Input
              id="birth_date"
              label={t("guests.birthDate")}
              type="date"
              {...register("birth_date")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="passport_number"
              label={t("guests.passportNumber")}
              {...register("passport_number")}
            />
            <Input
              id="id_document_type"
              label={t("guests.idDocumentType")}
              placeholder={t("guests.docTypePlaceholder")}
              {...register("id_document_type")}
            />
          </div>

          <Input
            id="id_document_number"
            label={t("guests.idDocumentNumber")}
            {...register("id_document_number")}
          />

          <Input id="address" label={t("guests.address")} {...register("address")} />
          <Input id="notes" label={t("guests.notes")} {...register("notes")} />

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {t("guests.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingGuest ? t("guests.update") : t("guests.create")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
