import { useState, useEffect, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Layers, Pencil, Trash2 } from "lucide-react"
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
import { getBranches } from "@/api/modules/branches"
import {
  getFloors,
  createFloor,
  updateFloor,
  deleteFloor,
} from "@/api/modules/rooms"
import type { Floor } from "@/types/room"
import type { Branch } from "@/types/branch"
import { extractItems } from "@/lib/form"
import { useScope } from "@/hooks/useScope"
import { usePermissions } from "@/lib/permissions"
import { useTranslation } from "react-i18next"

export function FloorsPage() {
  const { t } = useTranslation()
  const { scopeMerge } = useScope()
  const { can } = usePermissions()
  const canCreate = can("floor.create")
  const canEdit = can("floor.update")
  const canDelete = can("floor.delete")
  const queryClient = useQueryClient()

  const [selectedBranchId, setSelectedBranchId] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFloor, setEditingFloor] = useState<Floor | null>(null)

  const floorSchema = z.object({
    floor_number: z.number().int().min(-10).max(200),
    name: z.string().optional(),
  })
  type FloorForm = z.infer<typeof floorSchema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FloorForm>({
    resolver: zodResolver(floorSchema),
    defaultValues: { floor_number: 1, name: "" },
  })

  // Foydalanuvchi ko'ra oladigan filiallar (super-admin uchun barchasi, admin
  // uchun o'z mehmonxonasi — scopeMerge hotel_id ni qo'shadi).
  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ["branches", "floors-page"],
    queryFn: () => getBranches(scopeMerge({ page_size: "500" })),
  })
  const branches = useMemo(() => extractItems<Branch>(branchesData), [branchesData])

  // Birinchi filialni avtomatik tanlaymiz
  useEffect(() => {
    if (!selectedBranchId && branches.length > 0) {
      setSelectedBranchId(branches[0].id)
    }
  }, [branches, selectedBranchId])

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || null

  const { data: floorsData, isLoading: floorsLoading } = useQuery({
    queryKey: ["floors", "manage", selectedBranchId],
    queryFn: () => getFloors({ branch_id: selectedBranchId }),
    enabled: !!selectedBranchId,
  })
  const floors = useMemo(() => {
    const list = extractItems<Floor>(floorsData)
    return [...list].sort((a, b) => a.floor_number - b.floor_number)
  }, [floorsData])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["floors"] })
  }

  const createMutation = useMutation({
    mutationFn: createFloor,
    onSuccess: () => {
      invalidate()
      closeModal()
    },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; floor_number: number; name?: string }) =>
      updateFloor(id, data),
    onSuccess: () => {
      invalidate()
      closeModal()
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteFloor,
    onSuccess: invalidate,
  })

  const openCreate = () => {
    setEditingFloor(null)
    const nextNumber =
      floors.length > 0 ? Math.max(...floors.map((f) => f.floor_number)) + 1 : 1
    reset({ floor_number: nextNumber, name: "" })
    setModalOpen(true)
  }

  const openEdit = (floor: Floor) => {
    setEditingFloor(floor)
    reset({ floor_number: floor.floor_number, name: floor.name || "" })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingFloor(null)
  }

  const onSubmit = (values: FloorForm) => {
    if (editingFloor) {
      updateMutation.mutate({
        id: editingFloor.id,
        floor_number: values.floor_number,
        name: values.name || undefined,
      })
    } else {
      if (!selectedBranch) return
      createMutation.mutate({
        hotel_id: selectedBranch.hotel_id,
        branch_id: selectedBranch.id,
        floor_number: values.floor_number,
        name: values.name || undefined,
      })
    }
  }

  const branchOptions = branches.map((b) => ({
    value: b.id,
    label: b.code ? `${b.name} (${b.code})` : b.name,
  }))

  const columns: Column<Floor>[] = [
    {
      key: "floor_number",
      header: t("floors.floorNumber"),
      render: (f) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <Layers className="h-4 w-4" />
          </div>
          <span className="font-semibold text-gray-900">{f.floor_number}</span>
        </div>
      ),
    },
    {
      key: "name",
      header: t("floors.floorName"),
      render: (f) => <span className="text-sm text-gray-600">{f.name || "—"}</span>,
    },
    ...(canEdit || canDelete
      ? [
          {
            key: "actions" as string,
            header: "",
            render: (f: Floor) => (
              <div className="flex justify-end gap-1">
                {canEdit && (
                  <Button variant="ghost" size="sm" onClick={() => openEdit(f)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    {t("common.edit")}
                  </Button>
                )}
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => {
                      if (confirm(t("floors.deleteConfirmNum", { num: f.floor_number }))) {
                        deleteMutation.mutate(f.id)
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {t("common.delete")}
                  </Button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ]

  if (branchesLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("floors.title")}</h1>
          <p className="text-gray-500 mt-1">{t("floors.subtitle")}</p>
        </div>
        {canCreate && selectedBranchId && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t("floors.addFloor")}
          </Button>
        )}
      </div>

      {branches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-gray-400">
            {t("floors.noBranches")}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="max-w-sm">
            <Select
              id="branch"
              label={t("floors.branch")}
              options={branchOptions}
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            />
          </div>

          <Card>
            <CardContent className="pt-6">
              {floorsLoading ? (
                <div className="py-8 text-center text-sm text-gray-400">…</div>
              ) : (
                <DataTable
                  columns={columns}
                  data={floors}
                  keyField="id"
                  emptyMessage={t("floors.noFloors")}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingFloor ? t("floors.editFloor") : t("floors.newFloor")}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="floor_number"
            type="number"
            label={t("floors.floorNumber") + " *"}
            error={errors.floor_number ? t("floors.floorNumberRequired") : undefined}
            {...register("floor_number", { valueAsNumber: true })}
          />
          <Input
            id="name"
            label={t("floors.floorName")}
            placeholder={t("floors.floorNamePlaceholder")}
            {...register("name")}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingFloor ? t("common.save") : t("common.create")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
