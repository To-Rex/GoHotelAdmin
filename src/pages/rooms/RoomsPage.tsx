import { useState, useEffect, useRef, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, ChevronDown, ChevronRight, Search, X, Building2, DoorOpen } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Card,
  CardContent,
  PageLoader,
} from "@/components/ui"
import {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomTypes,
  getFloors,
  updateRoomStatus,
} from "@/api/modules/rooms"
import { getHotelAmenities, addRoomAmenity, removeRoomAmenity } from "@/api/modules/amenities"
import { getBranches } from "@/api/modules/branches"
import { getHotels } from "@/api/modules/hotels"
import type { Room, RoomCreateRequest, RoomUpdateRequest, RoomType, Floor, Amenity } from "@/types/room"
import type { Branch } from "@/types/branch"
import type { Hotel } from "@/types/hotel"
import { formatDate, cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

export function RoomsPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId, branchId } = useScope()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [statusModal, setStatusModal] = useState<Room | null>(null)
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([])

  const roomSchema = z.object({
    hotel_id: z.string().min(1, t("rooms.hotelRequired")),
    branch_id: z.string().min(1, t("rooms.branchRequired")),
    floor_id: z.string().optional(),
    room_type_id: z.string().optional(),
    room_number: z.string().min(1, t("rooms.roomNumberRequired")),
    base_price: z.number().min(0).optional(),
    capacity: z.number().min(1).nullable().optional(),
    notes: z.string().optional(),
  })

  type RoomForm = z.infer<typeof roomSchema>

  const STATUS_OPTIONS = [
    "AVAILABLE", "RESERVED", "OCCUPIED", "CLEANING",
    "MAINTENANCE", "INSPECTION", "OUT_OF_SERVICE",
  ]

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RoomForm>({
    resolver: zodResolver(roomSchema),
  })

  const watchedHotelId = watch("hotel_id")
  const watchedBranchId = watch("branch_id")
  const watchedRoomTypeId = watch("room_type_id")
  const prevHotelId = useRef(watchedHotelId)
  const prevBranchId = useRef(watchedBranchId)

  useEffect(() => {
    if (prevHotelId.current && watchedHotelId && prevHotelId.current !== watchedHotelId) {
      setValue("branch_id", "")
      setValue("floor_id", "")
    }
    prevHotelId.current = watchedHotelId
  }, [watchedHotelId, setValue])

  useEffect(() => {
    if (prevBranchId.current && watchedBranchId && prevBranchId.current !== watchedBranchId) {
      setValue("floor_id", "")
    }
    prevBranchId.current = watchedBranchId
  }, [watchedBranchId, setValue])

  const { data: hotelsData } = useQuery({
    queryKey: ["hotels", "select"],
    queryFn: () => getHotels({ page_size: "200" }),
  })

  const { data: allBranchesData } = useQuery({
    queryKey: ["branches", "all"],
    queryFn: () => getBranches({ page_size: "500" }),
  })

  const { data: allRoomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms", "all"],
    queryFn: () => getRooms(scopeMerge({ page_size: "2000" })),
  })

  const { data: roomTypes } = useQuery({
    queryKey: ["room-types"],
    queryFn: getRoomTypes,
  })

  useEffect(() => {
    if (watchedRoomTypeId) {
      const types: RoomType[] = Array.isArray(roomTypes) ? roomTypes : []
      const selected = types.find((t) => t.id === watchedRoomTypeId)
      if (selected?.base_price) {
        setValue("base_price", selected.base_price)
      }
    }
  }, [watchedRoomTypeId, roomTypes, setValue])

  const { data: amenitiesData } = useQuery({
    queryKey: ["hotel-amenities", watchedHotelId || hotelId],
    queryFn: () => {
      const hId = watchedHotelId || hotelId
      if (!hId) return []
      return getHotelAmenities(hId)
    },
    enabled: !!(watchedHotelId || hotelId),
    retry: false,
  })

  const { data: branchesData } = useQuery({
    queryKey: ["branches", "select", watchedHotelId],
    queryFn: () => {
      const params: Record<string, string> = { page_size: "100" }
      if (isSuperAdmin && watchedHotelId) params.hotel_id = watchedHotelId
      return getBranches(scopeMerge(params))
    },
    enabled: isSuperAdmin ? !!watchedHotelId : true,
  })

  const { data: floors } = useQuery({
    queryKey: ["floors", "select", watchedBranchId],
    queryFn: () => {
      const params: Record<string, string> = {}
      if (watchedBranchId) params.branch_id = watchedBranchId
      return getFloors(params)
    },
    enabled: !!watchedBranchId,
  })

  const hotelsList: Hotel[] = useMemo(
    () => hotelsData?.items ?? (Array.isArray(hotelsData) ? hotelsData : []),
    [hotelsData]
  )

  const allBranches: Branch[] = useMemo(
    () => allBranchesData?.items ?? (Array.isArray(allBranchesData) ? allBranchesData : []),
    [allBranchesData]
  )

  const allRooms: Room[] = useMemo(
    () => (Array.isArray(allRoomsData) ? allRoomsData : (allRoomsData as any)?.items ?? []),
    [allRoomsData]
  )

  const allAmenities: Amenity[] = useMemo(
    () => (Array.isArray(amenitiesData) ? amenitiesData : (amenitiesData as any)?.items ?? []),
    [amenitiesData]
  )

  const visibleHotels = useMemo(() => {
    if (!isSuperAdmin && hotelId) return hotelsList.filter((h) => h.id === hotelId)
    return hotelsList
  }, [hotelsList, isSuperAdmin, hotelId])

  const visibleBranches = useMemo(() => {
    if (!isSuperAdmin && branchId) return allBranches.filter((b) => b.id === branchId)
    return allBranches
  }, [allBranches, isSuperAdmin, branchId])

  const q = search.toLowerCase().trim()

  const hotelTree = useMemo(() => {
    return visibleHotels
      .map((hotel) => {
        const hotelBranches = visibleBranches.filter((b) => b.hotel_id === hotel.id)
        const branchesWithRooms = hotelBranches
          .map((branch) => {
            const branchRooms = allRooms.filter((r) => r.branch_id === branch.id)
            if (q) {
              return branchRooms.some(
                (r) =>
                  r.room_number.toLowerCase().includes(q) ||
                  r.room_type?.name?.toLowerCase().includes(q) ||
                  (r.floor && String(r.floor.floor_number).includes(q))
              )
                ? branch
                : null
            }
            return branchRooms.length > 0 ? branch : null
          })
          .filter(Boolean) as Branch[]

        if (q && branchesWithRooms.length === 0) {
          const nameMatch =
            hotel.name.toLowerCase().includes(q) || hotel.code?.toLowerCase().includes(q)
          if (!nameMatch) return null
        }

        return { hotel, branches: branchesWithRooms }
      })
      .filter(Boolean) as { hotel: Hotel; branches: Branch[] }[]
  }, [visibleHotels, visibleBranches, allRooms, q])

  const toggleHotel = (hotelId: string) => {
    setExpandedHotels((prev) => {
      const next = new Set(prev)
      if (next.has(hotelId)) next.delete(hotelId)
      else next.add(hotelId)
      return next
    })
  }

  const toggleBranch = (branchId: string) => {
    setExpandedBranches((prev) => {
      const next = new Set(prev)
      if (next.has(branchId)) next.delete(branchId)
      else next.add(branchId)
      return next
    })
  }

  const createMutation = useMutation({
    mutationFn: async (data: RoomCreateRequest) => {
      const amenityIds = [...selectedAmenities]
      const room = await createRoom(data)
      if (room.id && amenityIds.length > 0) {
        const params: Record<string, string> = {}
        if (isSuperAdmin && hotelId) params.hotel_id = hotelId
        await Promise.all(amenityIds.map((aid) => addRoomAmenity(room.id, aid, params)))
      }
      return room
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
      setModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: RoomUpdateRequest }) => {
      const params: Record<string, string> = {}
      if (isSuperAdmin && hotelId) params.hotel_id = hotelId
      const room = await updateRoom(id, data)

      if (editingRoom) {
        const currentIds = (editingRoom.amenities || []).map((a) => a.id)
        const newIds = selectedAmenities
        const toAdd = newIds.filter((aid) => !currentIds.includes(aid))
        const toRemove = currentIds.filter((aid) => !newIds.includes(aid))
        await Promise.all([
          ...toAdd.map((aid) => addRoomAmenity(id, aid, params)),
          ...toRemove.map((aid) => removeRoomAmenity(id, aid, params)),
        ])
      }
      return room
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
      setModalOpen(false)
      setEditingRoom(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rooms"] }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      updateRoomStatus(id, { status: status as Room["current_status"], notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] })
      setStatusModal(null)
    },
  })

  const openCreate = (hId?: string, bId?: string) => {
    reset({
      room_number: "",
      hotel_id: hId || hotelId || "",
      branch_id: bId || "",
      capacity: 1,
      base_price: 0,
    })
    setSelectedAmenities([])
    setEditingRoom(null)
    setModalOpen(true)
  }

  const openEdit = (room: Room) => {
    reset({
      hotel_id: room.hotel_id,
      branch_id: room.branch_id,
      floor_id: room.floor_id || "",
      room_type_id: room.room_type_id || "",
      room_number: room.room_number,
      base_price: room.base_price ?? 0,
      capacity: room.capacity ?? 1,
      notes: room.notes || "",
    })
    setSelectedAmenities((room.amenities || []).map((a) => a.id))
    setEditingRoom(room)
    setModalOpen(true)
  }

  const onSubmit = (values: RoomForm) => {
    if (editingRoom) {
      updateMutation.mutate({ id: editingRoom.id, data: values as RoomUpdateRequest })
    } else {
      createMutation.mutate(values as RoomCreateRequest)
    }
  }

  const typeOptions = useMemo(() => {
    const types: RoomType[] = Array.isArray(roomTypes) ? roomTypes : []
    return types.map((rt) => ({
      value: rt.id,
      label: `${rt.name} (${rt.base_price.toLocaleString()} ${t("common.som")})`,
    }))
  }, [roomTypes, t])

  const branchesList: Branch[] =
    branchesData?.items ?? (Array.isArray(branchesData) ? branchesData : [])
  const branchOptions = branchesList.map((b: Branch) => ({
    value: b.id,
    label: `${b.name}${b.code ? ` (${b.code})` : ""}`,
  }))

  const hotelOptions = hotelsList.map((h: Hotel) => ({
    value: h.id,
    label: h.name,
  }))

  const floorOptions =
    floors?.items?.map((f: Floor) => ({
      value: f.id,
      label: `${t("rooms.floor")} ${f.floor_number}${f.name ? ` - ${f.name}` : ""}`,
    })) ?? floors?.map?.((f: Floor) => ({
      value: f.id,
      label: `${t("rooms.floor")} ${f.floor_number}${f.name ? ` - ${f.name}` : ""}`,
    })) ?? []

  const getRoomsForBranch = (branchId: string) => {
    let list = allRooms.filter((r) => r.branch_id === branchId)
    if (q) {
      list = list.filter(
        (r) =>
          r.room_number.toLowerCase().includes(q) ||
          r.room_type?.name?.toLowerCase().includes(q) ||
          (r.floor && String(r.floor.floor_number).includes(q))
      )
    }
    return list
  }

  if (roomsLoading && allRooms.length === 0) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("rooms.title")}</h1>
          <p className="text-gray-500 mt-1">{t("rooms.subtitle")}</p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4" />
          {t("rooms.addRoom")}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("rooms.searchPlaceholder")}
          className="pl-10"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {hotelTree.map(({ hotel, branches }) => {
          const isHotelExpanded = expandedHotels.has(hotel.id)
          const hotelRoomCount = branches.reduce(
            (sum, b) => sum + allRooms.filter((r) => r.branch_id === b.id).length,
            0
          )

          return (
            <Card key={hotel.id}>
              <button
                onClick={() => toggleHotel(hotel.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors rounded-lg text-left"
              >
                {isHotelExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                )}
                <Building2 className="h-5 w-5 text-primary-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-gray-900">{hotel.name}</span>
                  {hotel.code && (
                    <span className="text-xs text-gray-400 ml-2">({hotel.code})</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {branches.length} {t("branches.title")} / {hotelRoomCount} {t("rooms.room")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isHotelExpanded) toggleHotel(hotel.id)
                    const firstBranch = branches[0]
                    openCreate(hotel.id, firstBranch?.id)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </button>

              {isHotelExpanded && (
                <div className="border-t border-gray-100">
                  {branches.length === 0 ? (
                    <div className="p-4 text-sm text-gray-400 text-center">
                      {t("rooms.noRooms")}
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {branches.map((branch) => {
                        const isBranchExpanded = expandedBranches.has(branch.id)
                        const roomsForBranch = getRoomsForBranch(branch.id)

                        return (
                          <div key={branch.id}>
                            <button
                              onClick={() => toggleBranch(branch.id)}
                              className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors rounded-lg text-left ml-2"
                            >
                              {isBranchExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              )}
                              <DoorOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span className="font-medium text-gray-700">{branch.name}</span>
                              {branch.code && (
                                <span className="text-xs text-gray-400">({branch.code})</span>
                              )}
                              <span className="text-xs text-gray-400 ml-auto shrink-0">
                                {roomsForBranch.length} {t("rooms.room")}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (!isBranchExpanded) toggleBranch(branch.id)
                                  openCreate(hotel.id, branch.id)
                                }}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                            </button>

                            {isBranchExpanded && (
                              <div className="ml-6 border-l-2 border-gray-100 pl-4">
                                {roomsForBranch.length === 0 ? (
                                  <div className="py-3 text-sm text-gray-400">
                                    {t("rooms.noRooms")}
                                  </div>
                                ) : (
                                  <div className="space-y-1 py-1">
                                    <div className="grid grid-cols-12 gap-2 px-3 py-1 text-xs font-medium text-gray-400 uppercase">
                                      <span className="col-span-2">{t("rooms.room")}</span>
                                      <span className="col-span-2">{t("rooms.type")}</span>
                                      <span className="col-span-1">{t("rooms.floor")}</span>
                                      <span className="col-span-1">{t("rooms.price")}</span>
                                      <span className="col-span-2">{t("rooms.status")}</span>
                                      <span className="col-span-2">{t("rooms.created")}</span>
                                      <span className="col-span-2" />
                                    </div>
                                    {roomsForBranch.map((room) => (
                                      <div
                                        key={room.id}
                                        className={cn(
                                          "grid grid-cols-12 gap-2 px-3 py-2 rounded-md items-center",
                                          "hover:bg-gray-50 transition-colors"
                                        )}
                                      >
                                        <span className="col-span-2 font-medium text-gray-900 text-sm">
                                          {room.room_number}
                                        </span>
                                        <span className="col-span-2 text-sm text-gray-600">
                                          {room.room_type?.name || "-"}
                                        </span>
                                        <span className="col-span-1 text-sm text-gray-600">
                                          {room.floor
                                            ? `${room.floor.floor_number}`
                                            : "-"}
                                        </span>
                                        <span className="col-span-1 text-sm font-medium text-primary-700">
                                          {room.base_price ? `${room.base_price.toLocaleString()} ${t("common.som")}` : "—"}
                                        </span>
                                        <span className="col-span-2">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setStatusModal(room)
                                            }}
                                          >
                                            <Badge variant={room.current_status} />
                                          </button>
                                        </span>
                                        <span className="col-span-2 text-xs text-gray-500">
                                          {formatDate(room.created_at)}
                                        </span>
                                        <span className="col-span-2 flex gap-1 justify-end">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEdit(room)}
                                          >
                                            {t("rooms.edit")}
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600"
                                            onClick={() => {
                                              if (confirm(t("rooms.deleteConfirm")))
                                                deleteMutation.mutate(room.id)
                                            }}
                                          >
                                            {t("rooms.delete")}
                                          </Button>
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
        {hotelTree.length === 0 && !roomsLoading && (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t("rooms.noRooms")}</p>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingRoom(null)
        }}
        title={editingRoom ? t("rooms.editRoom") : t("rooms.createRoom")}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isSuperAdmin && (
            <Select
              id="hotel_id"
              label={t("rooms.hotel") + " *"}
              options={hotelOptions}
              placeholder={t("rooms.selectHotel")}
              error={errors.hotel_id?.message}
              {...register("hotel_id")}
            />
          )}
          <Select
            id="branch_id"
            label={t("rooms.branch") + " *"}
            options={branchOptions}
            placeholder={t("rooms.selectBranch")}
            error={errors.branch_id?.message}
            disabled={!isSuperAdmin && !!branchId}
            {...register("branch_id")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="room_number"
              label={t("rooms.roomNumber") + " *"}
              error={errors.room_number?.message}
              {...register("room_number")}
            />
            <Input
              id="base_price"
              label={t("rooms.basePrice")}
              type="number"
              min={0}
              placeholder="0"
              {...register("base_price", { valueAsNumber: true })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="capacity"
              label={t("rooms.capacity")}
              type="number"
              min={1}
              {...register("capacity", { valueAsNumber: true })}
            />
            <Select
              id="floor_id"
              label={t("rooms.floor")}
              options={floorOptions}
              placeholder={t("rooms.selectFloor")}
              {...register("floor_id")}
            />
          </div>

          <Select
            id="room_type_id"
            label={t("rooms.roomType")}
            options={typeOptions}
            placeholder={t("rooms.selectRoomType")}
            {...register("room_type_id")}
          />

          {allAmenities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Qulayliklar
              </label>
              <div className="flex flex-wrap gap-2">
                {allAmenities.map((a) => {
                  const isSelected = selectedAmenities.includes(a.id)
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setSelectedAmenities((prev) =>
                          isSelected ? prev.filter((id) => id !== a.id) : [...prev, a.id]
                        )
                      }}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        isSelected
                          ? "bg-primary-100 text-primary-700 ring-1 ring-primary-300"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {a.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <Input id="notes" label={t("rooms.notes")} {...register("notes")} />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {t("rooms.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingRoom ? t("rooms.update") : t("rooms.create")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!statusModal}
        onClose={() => setStatusModal(null)}
        title={`${t("rooms.updateStatus")}: ${t("rooms.room")} ${statusModal?.room_number}`}
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("rooms.current")}: <Badge variant={statusModal?.current_status || "AVAILABLE"} />
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <Button
                key={s}
                variant={statusModal?.current_status === s ? "primary" : "outline"}
                size="sm"
                onClick={() => statusMutation.mutate({ id: statusModal!.id, status: s })}
                disabled={statusMutation.isPending}
              >
                {s.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
