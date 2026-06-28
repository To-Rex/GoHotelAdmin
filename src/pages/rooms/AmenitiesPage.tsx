import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Wifi, Pencil, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Button,
  Input,
  Badge,
  Card,
  CardContent,
  Modal,
  PageLoader,
} from "@/components/ui"
import {
  getAmenities,
  createAmenity,
  updateAmenity,
  deleteAmenity,
} from "@/api/modules/amenities"
import type { Amenity } from "@/types/room"
import { useScope } from "@/hooks/useScope"

const ICON_OPTIONS = [
  { value: "", label: "Ikonkasiz" },
  { value: "wifi", label: "Wi-Fi" },
  { value: "tv", label: "TV" },
  { value: "wind", label: "Konditsioner" },
  { value: "bath", label: "Vanna" },
  { value: "coffee", label: "Kofe" },
  { value: "parking", label: "Avtoturargoh" },
  { value: "pool", label: "Hovuz" },
  { value: "gym", label: "Sport zal" },
  { value: "spa", label: "SPA" },
  { value: "restaurant", label: "Restoran" },
  { value: "bar", label: "Bar" },
  { value: "laundry", label: "Kir yuvish" },
  { value: "safe", label: "Seyf" },
  { value: "fridge", label: "Muzlatgich" },
]

export function AmenitiesPage() {
  const { isSuperAdmin } = useScope()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAmenity, setEditingAmenity] = useState<Amenity | null>(null)

  const amenitySchema = z.object({
    name: z.string().min(1, "Nomi talab qilinadi"),
    icon: z.string().optional(),
  })

  type AmenityForm = z.infer<typeof amenitySchema>

  const { data, isLoading } = useQuery({
    queryKey: ["amenities"],
    queryFn: getAmenities,
  })

  const amenities: Amenity[] = Array.isArray(data) ? data : []

  const filtered = search
    ? amenities.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
      )
    : amenities

  const createMutation = useMutation({
    mutationFn: createAmenity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenities"] })
      setModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AmenityForm }) =>
      updateAmenity(id, { name: data.name, icon: data.icon || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["amenities"] })
      setModalOpen(false)
      setEditingAmenity(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAmenity,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["amenities"] }),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AmenityForm>({
    resolver: zodResolver(amenitySchema),
  })

  const openCreate = () => {
    reset({ name: "", icon: "" })
    setEditingAmenity(null)
    setModalOpen(true)
  }

  const openEdit = (a: Amenity) => {
    reset({ name: a.name, icon: a.icon || "" })
    setEditingAmenity(a)
    setModalOpen(true)
  }

  const onSubmit = (values: AmenityForm) => {
    if (editingAmenity) {
      updateMutation.mutate({ id: editingAmenity.id, data: values })
    } else {
      createMutation.mutate(values)
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Qulayliklar</h1>
          <p className="text-gray-500 mt-1">
            {isSuperAdmin
              ? "Global qulayliklar ro'yxati — barcha mehmonxonalarga biriktirish mumkin"
              : "Mavjud qulayliklar ro'yxati"}
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Yangi qulaylik
          </Button>
        )}
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((a) => (
          <Card key={a.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                    <Wifi className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400">{a.icon || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={a.is_active ? "ACTIVE" : "INACTIVE"} />
                </div>
              </div>
              {isSuperAdmin && (
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(a)}
                    className="flex-1"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Tahrirlash
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm(`"${a.name}" o'chirilsinmi?`)) {
                        deleteMutation.mutate(a.id)
                      }
                    }}
                    className="text-red-600 hover:text-red-700 flex-1"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    O'chirish
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {filtered.length === 0 && !isLoading && (
        <div className="text-center py-12 text-gray-400">
          <Wifi className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Qulayliklar topilmadi</p>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingAmenity(null)
        }}
        title={
          editingAmenity ? "Qulaylikni tahrirlash" : "Yangi qulaylik qo'shish"
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="name"
            label="Nomi *"
            placeholder="Masalan: Wi-Fi, TV"
            error={errors.name?.message}
            {...register("name")}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Ikonka
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              {...register("icon")}
            >
              {ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false)
                setEditingAmenity(null)
              }}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingAmenity ? "Yangilash" : "Yaratish"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
