import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, DollarSign } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  DataTable,
  Modal,
  PageLoader,
} from "@/components/ui"
import type { Column } from "@/components/ui"
import {
  getRoomTypes,
  createRoomType,
  updateRoomType,
  updateRoomTypeStatus,
  deleteRoomType,
} from "@/api/modules/rooms"
import type { RoomType } from "@/types/room"
import { useScope } from "@/hooks/useScope"
import { useTranslation } from "react-i18next"

export function RoomTypesPage() {
  const { t } = useTranslation()
  const { isSuperAdmin } = useScope()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<RoomType | null>(null)

  const roomTypeSchema = z.object({
    name: z.string().min(1, t("roomTypes.nameRequired")),
    description: z.string().optional(),
    base_price: z.number().min(0, t("roomTypes.priceNonNegative")),
  })

  type RoomTypeForm = z.infer<typeof roomTypeSchema>

  const { data, isLoading } = useQuery({
    queryKey: ["roomTypes"],
    queryFn: getRoomTypes,
  })

  const roomTypes: RoomType[] = Array.isArray(data) ? data : []

  const filteredTypes = search
    ? roomTypes.filter(
        (rt) =>
          rt.name.toLowerCase().includes(search.toLowerCase()) ||
          String(rt.base_price).includes(search)
      )
    : roomTypes

  const createMutation = useMutation({
    mutationFn: (values: RoomTypeForm) =>
      createRoomType({
        name: values.name,
        description: values.description || undefined,
        base_price: values.base_price,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomTypes"] })
      setModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: RoomTypeForm }) =>
      updateRoomType(id, {
        name: data.name,
        description: data.description || undefined,
        base_price: data.base_price,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomTypes"] })
      setModalOpen(false)
      setEditingType(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRoomType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roomTypes"] })
    },
  })

  const toggleStatus = async (id: string, active: boolean) => {
    await updateRoomTypeStatus(id, !active)
    queryClient.invalidateQueries({ queryKey: ["roomTypes"] })
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoomTypeForm>({
    resolver: zodResolver(roomTypeSchema),
  })

  const openCreate = () => {
    reset({ name: "", description: "", base_price: 0 })
    setEditingType(null)
    setModalOpen(true)
  }

  const openEdit = (rt: RoomType) => {
    reset({
      name: rt.name,
      description: rt.description || "",
      base_price: rt.base_price,
    })
    setEditingType(rt)
    setModalOpen(true)
  }

  const onSubmit = (values: RoomTypeForm) => {
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: values })
    } else {
      createMutation.mutate(values)
    }
  }

  const columns: Column<RoomType>[] = [
    {
      key: "name",
      header: t("roomTypes.name"),
      render: (rt) => (
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary-500" />
          <span className="font-medium text-gray-900">{rt.name}</span>
        </div>
      ),
    },
    {
      key: "base_price",
      header: t("roomTypes.basePrice"),
      render: (rt) => (
        <span className="font-semibold text-primary-700">
          {rt.base_price > 0 ? `${rt.base_price.toLocaleString()} ${t("common.som")}` : "—"}
        </span>
      ),
    },
    {
      key: "description",
      header: t("roomTypes.description"),
      render: (rt) => (
        <span className="text-sm text-gray-500">{rt.description || "—"}</span>
      ),
    },
    {
      key: "is_active",
      header: t("roomTypes.status"),
      render: (rt) =>
        isSuperAdmin ? (
          <button
            onClick={() => toggleStatus(rt.id, rt.is_active)}
            className="cursor-pointer"
          >
            <Badge variant={rt.is_active ? "ACTIVE" : "INACTIVE"} />
          </button>
        ) : (
          <Badge variant={rt.is_active ? "ACTIVE" : "INACTIVE"} />
        ),
    },
    ...(isSuperAdmin
      ? [
          {
            key: "actions" as string,
            header: "",
            render: (rt: RoomType) => (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(rt)
                  }}
                >
                  {t("common.edit")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(t("roomTypes.deleteConfirm", { name: rt.name }))) {
                      deleteMutation.mutate(rt.id)
                    }
                  }}
                >
                  {t("common.delete")}
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ]

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("roomTypes.title")}</h1>
          <p className="text-gray-500 mt-1">
            {isSuperAdmin ? t("roomTypes.subtitleGlobal") : t("roomTypes.subtitle")}
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("roomTypes.newType")}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={filteredTypes}
            keyField="id"
            isLoading={isLoading}
            searchable
            searchPlaceholder={t("common.search")}
            onSearch={setSearch}
          />
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingType(null)
        }}
        title={editingType ? t("roomTypes.editType") : t("roomTypes.addType")}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="name"
            label={t("roomTypes.name") + " *"}
            placeholder={t("roomTypes.namePlaceholder")}
            error={errors.name?.message}
            {...register("name")}
          />
          <Input
            id="description"
            label={t("roomTypes.description")}
            placeholder={t("roomTypes.descriptionPlaceholder")}
            error={errors.description?.message}
            {...register("description")}
          />
          <Input
            id="base_price"
            label={t("roomTypes.basePriceLabel") + " *"}
            type="number"
            placeholder="0"
            error={errors.base_price?.message}
            {...register("base_price", { valueAsNumber: true })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false)
                setEditingType(null)
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingType ? t("common.update") : t("common.create")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
