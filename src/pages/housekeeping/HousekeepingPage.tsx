import { useState, useMemo, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient, useIsFetching } from "@tanstack/react-query"
import { Plus, ChevronDown, ChevronRight, Search, X, Building2, DoorOpen, Brush, Image as ImageIcon, RefreshCw } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import api from "@/api/client"
import {
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Card,
  PageLoader,
} from "@/components/ui"
import {
  getHousekeepingTasks,
  createHousekeepingTask,
  updateHousekeepingTask,
  updateHousekeepingTaskStatus,
  assignHousekeepingTask,
  getTaskPhotos,
} from "@/api/modules/housekeeping"
import type { HousekeepingTask, HousekeepingTaskCreateRequest, TaskPhoto } from "@/types/housekeeping"
import { getHotels } from "@/api/modules/hotels"
import { getBranches } from "@/api/modules/branches"
import { getRooms } from "@/api/modules/rooms"
import { getEmployees } from "@/api/modules/employees"
import { formatDate, cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"
import { usePermissions } from "@/lib/permissions"

function PhotoImage({ taskId, photoId, fileName }: { taskId: string; photoId: string; fileName: string }) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const url = `/tasks/${taskId}/photos/${photoId}/view`
    api.get(url, { responseType: "blob" })
      .then((res) => {
        if (!cancelled) {
          setSrc(URL.createObjectURL(res.data))
        }
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => { cancelled = true }
  }, [taskId, photoId])

  if (error) return <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">{fileName}</div>
  if (!src) return <div className="w-full h-40 bg-gray-50 animate-pulse" />
  return <img src={src} alt={fileName} className="w-full h-40 object-cover" />
}

export function HousekeepingPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId, branchId } = useScope()
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const isFetching = useIsFetching({ queryKey: ["housekeeping"] }) > 0
  const [search, setSearch] = useState("")
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [assignModal, setAssignModal] = useState<HousekeepingTask | null>(null)
  const [photoModal, setPhotoModal] = useState<HousekeepingTask | null>(null)

  const { data: taskPhotos, isLoading: photosLoading } = useQuery({
    queryKey: ["task-photos", photoModal?.id],
    queryFn: () => getTaskPhotos(photoModal!.id, { hotel_id: photoModal!.hotel_id }),
    enabled: !!photoModal,
  })

  const taskSchema = z.object({
    hotel_id: z.string().min(1, t("housekeeping.hotelRequired")),
    branch_id: z.string().min(1, t("housekeeping.branchRequired")),
    room_id: z.string().min(1, t("housekeeping.roomRequired")),
    task_type: z.enum(["CLEANING", "DEEP_CLEANING", "MAINTENANCE", "INSPECTION", "TURN_DOWN"]),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    assigned_to: z.string().optional(),
    notes: z.string().optional(),
    scheduled_date: z.string().optional(),
  })

  type TaskForm = z.infer<typeof taskSchema>

  const { data: hotelsData } = useQuery({
    queryKey: ["hotels", "select"],
    queryFn: () => getHotels({ page_size: "200" }),
  })

  const { data: allBranchesData } = useQuery({
    queryKey: ["branches", "all"],
    queryFn: () => getBranches({ page_size: "500" }),
  })

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ["housekeeping", "all"],
    queryFn: () => getHousekeepingTasks(scopeMerge({ page_size: "2000" })),
  })

  const hotelsList = useMemo(() => {
    const raw = (hotelsData as any)?.items ?? (Array.isArray(hotelsData) ? hotelsData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [hotelsData])

  const allBranches = useMemo(() => {
    const raw = (allBranchesData as any)?.items ?? (Array.isArray(allBranchesData) ? allBranchesData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [allBranchesData])

  const allTasks: HousekeepingTask[] = useMemo(
    () => (Array.isArray(tasksData) ? tasksData : (tasksData as any)?.items ?? []),
    [tasksData]
  )

  const visibleHotels = useMemo(() => {
    if (!isSuperAdmin && hotelId) return hotelsList.filter((h: any) => h.id === hotelId)
    return hotelsList
  }, [hotelsList, isSuperAdmin, hotelId])

  const visibleBranches = useMemo(() => {
    if (!isSuperAdmin && branchId) return allBranches.filter((b: any) => b.id === branchId)
    return allBranches
  }, [allBranches, isSuperAdmin, branchId])

  const q = search.toLowerCase().trim()

  const hotelTree = useMemo(() => {
    return visibleHotels
      .map((hotel: any) => {
        const hotelBranches = visibleBranches.filter((b: any) => b.hotel_id === hotel.id)
        const branchesWithTasks = hotelBranches
          .map((branch: any) => {
            let branchTasks = allTasks.filter((t) => t.branch_id === branch.id)
            if (q) {
              branchTasks = branchTasks.filter(
                (t) =>
                  t.room?.room_number?.toLowerCase().includes(q) ||
                  t.task_type.toLowerCase().includes(q) ||
                  t.assigned_user?.first_name?.toLowerCase().includes(q) ||
                  t.assigned_user?.last_name?.toLowerCase().includes(q)
              )
              if (branchTasks.length === 0) return null
            }
            return { branch, tasks: branchTasks }
          })
          .filter(Boolean) as { branch: any; tasks: HousekeepingTask[] }[]

        if (q && branchesWithTasks.length === 0) {
          if (!hotel.name.toLowerCase().includes(q)) return null
        }

        return { hotel, branches: branchesWithTasks }
      })
      .filter(Boolean) as { hotel: any; branches: { branch: any; tasks: HousekeepingTask[] }[] }[]
  }, [visibleHotels, visibleBranches, allTasks, q])

  const toggleHotel = (id: string) => {
    setExpandedHotels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleBranch = (id: string) => {
    setExpandedBranches((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const createMutation = useMutation({
    mutationFn: createHousekeepingTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] })
      setModalOpen(false)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateHousekeepingTaskStatus(id, { status: status as HousekeepingTask["status"] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["housekeeping"] }),
  })

  const assignMutation = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      assignHousekeepingTask(id, { assigned_to: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["housekeeping"] })
      setAssignModal(null)
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { task_type: "CLEANING", priority: "MEDIUM" },
  })

  const watchedHotelId = watch("hotel_id")
  const watchedBranchId = watch("branch_id")
  const prevHotelId = useRef(watchedHotelId)
  const prevBranchId = useRef(watchedBranchId)

  useEffect(() => {
    if (prevHotelId.current && watchedHotelId && prevHotelId.current !== watchedHotelId) {
      setValue("branch_id", "")
      setValue("room_id", "")
    }
    prevHotelId.current = watchedHotelId
  }, [watchedHotelId, setValue])

  useEffect(() => {
    if (prevBranchId.current && watchedBranchId && prevBranchId.current !== watchedBranchId) {
      setValue("room_id", "")
    }
    prevBranchId.current = watchedBranchId
  }, [watchedBranchId, setValue])

  const { data: roomsData } = useQuery({
    queryKey: ["rooms", "select", watchedBranchId],
    queryFn: () => {
      const params: Record<string, string> = { page_size: "500" }
      if (watchedBranchId) params.branch_id = watchedBranchId
      return getRooms(params)
    },
    enabled: !!watchedBranchId,
  })

  const roomsList = useMemo(() => {
    const raw = (roomsData as any)?.items ?? (Array.isArray(roomsData) ? roomsData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [roomsData])

  const { data: employeesData } = useQuery({
    queryKey: ["employees", "select"],
    queryFn: () => getEmployees(scopeMerge({ page_size: "500" })),
  })

  const employeesList = useMemo(() => {
    const raw = (employeesData as any)?.items ?? (Array.isArray(employeesData) ? employeesData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [employeesData])

  const openCreate = (hId?: string, bId?: string) => {
    reset({
      hotel_id: hId || hotelId || "",
      branch_id: bId || "",
      room_id: "",
      task_type: "CLEANING",
      priority: "MEDIUM",
    })
    setModalOpen(true)
  }

  const onSubmit = (values: TaskForm) => {
    createMutation.mutate(values as HousekeepingTaskCreateRequest)
  }

  const getTasksForBranch = (branchId: string) => {
    let list = allTasks.filter((t) => t.branch_id === branchId)
    if (q) {
      list = list.filter(
        (t) =>
          t.room?.room_number?.toLowerCase().includes(q) ||
          t.task_type.toLowerCase().includes(q) ||
          t.assigned_user?.first_name?.toLowerCase().includes(q) ||
          t.assigned_user?.last_name?.toLowerCase().includes(q)
      )
    }
    return list
  }

  if (isLoading && allTasks.length === 0) return <PageLoader />

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t("housekeeping.title")}</h1>
          <p className="text-sm text-gray-500 mt-1">{t("housekeeping.subtitle")}</p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            title={t("housekeeping.refresh", "Refresh")}
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["housekeeping"] })
              queryClient.invalidateQueries({ queryKey: ["hotels"] })
              queryClient.invalidateQueries({ queryKey: ["branches"] })
              queryClient.invalidateQueries({ queryKey: ["employees"] })
            }}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
          {can("housekeeping.task.create") && (
            <Button onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              {t("housekeeping.newTask")}
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("housekeeping.searchPlaceholder")}
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
          const totalTasks = branches.reduce((sum, b) => sum + b.tasks.length, 0)

          return (
            <Card key={hotel.id}>
              <button
                onClick={() => toggleHotel(hotel.id)}
                className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 hover:bg-gray-50 transition-colors rounded-lg text-left"
              >
                {isHotelExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                )}
                <Building2 className="h-5 w-5 text-primary-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm sm:text-base text-gray-900 truncate block">{hotel.name}</span>
                  {hotel.code && (
                    <span className="text-xs text-gray-400 hidden sm:inline">({hotel.code})</span>
                  )}
                </div>
                <span className="text-xs text-gray-400 shrink-0 hidden sm:block">
                  {branches.length} {t("rooms.branch")} / {totalTasks} {t("housekeeping.title")}
                </span>
                <span className="text-xs text-gray-400 shrink-0 sm:hidden">
                  {branches.length}b / {totalTasks}t
                </span>
                {can("housekeeping.task.create") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isHotelExpanded) toggleHotel(hotel.id)
                      const firstBranch = branches[0]
                      openCreate(hotel.id, firstBranch?.branch.id)
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )}
              </button>

              {isHotelExpanded && (
                <div className="border-t border-gray-100">
                  {branches.length === 0 ? (
                    <div className="p-4 text-sm text-gray-400 text-center">
                      {t("housekeeping.noTasks", "No tasks")}
                    </div>
                  ) : (
                    <div className="space-y-1 p-1 sm:p-2">
                      {branches.map(({ branch, tasks }) => {
                        const isBranchExpanded = expandedBranches.has(branch.id)
                        const branchTasks = getTasksForBranch(branch.id)

                        return (
                          <div key={branch.id}>
                            <button
                              onClick={() => toggleBranch(branch.id)}
                              className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 hover:bg-gray-50 transition-colors rounded-lg text-left ml-1 sm:ml-2"
                            >
                              {isBranchExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              )}
                              <DoorOpen className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span className="font-medium text-sm text-gray-700 truncate">{branch.name}</span>
                              {branch.code && (
                                <span className="text-xs text-gray-400 hidden sm:inline">({branch.code})</span>
                              )}
                              <span className="text-xs text-gray-400 ml-auto shrink-0">
                                {branchTasks.length}
                              </span>
                              {can("housekeeping.task.create") && (
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
                              )}
                            </button>

                            {isBranchExpanded && (
                              <div className="ml-3 sm:ml-6 border-l-2 border-gray-100 pl-2 sm:pl-4">
                                {branchTasks.length === 0 ? (
                                  <div className="py-3 text-sm text-gray-400">
                                    {t("housekeeping.noTasks", "No tasks")}
                                  </div>
                                ) : (
                                  <div className="space-y-0">
                                    <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 rounded-t-md border-b border-gray-200">
                                      <span className="col-span-1">{t("housekeeping.room")}</span>
                                      <span className="col-span-1">{t("housekeeping.type")}</span>
                                      <span className="col-span-1">{t("housekeeping.priority")}</span>
                                      <span className="col-span-2">{t("housekeeping.status")}</span>
                                      <span className="col-span-2">{t("housekeeping.assignedTo")}</span>
                                      <span className="col-span-2">{t("housekeeping.scheduled")}</span>
                                      <span className="col-span-3 text-right">{t("housekeeping.actions", "Actions")}</span>
                                    </div>
                                    {branchTasks.map((task, idx) => (
                                      <div
                                        key={task.id}
                                        className={cn(
                                          "transition-colors border-b border-gray-50 last:border-b-0",
                                          "md:grid md:grid-cols-12 md:gap-2 md:px-4 md:py-3 md:items-center",
                                          "flex flex-col gap-1.5 p-3 sm:p-3 md:p-0 border border-gray-100 md:border-0 md:border-b md:border-gray-100 rounded-lg md:rounded-none mb-2 md:mb-0",
                                          idx % 2 === 0 ? "md:bg-white" : "md:bg-gray-50/30",
                                          "hover:bg-gray-100/50 md:hover:bg-blue-50/30"
                                        )}
                                      >
                                        <div className="md:hidden flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-50 text-primary-700 font-bold text-xs">
                                              {task.room?.room_number || "?"}
                                            </span>
                                            <span className="font-semibold text-gray-900 text-sm">
                                              {t("housekeeping.room")}: {task.room?.room_number || t("housekeeping.na")}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-0.5">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className={cn(
                                                "relative",
                                                task.photo_count > 0
                                                  ? "text-blue-600 hover:text-blue-800"
                                                  : "text-gray-300 hover:text-gray-500"
                                              )}
                                              onClick={() => setPhotoModal(task)}
                                            >
                                              <ImageIcon className="h-4 w-4" />
                                              {task.photo_count > 0 && (
                                                <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-blue-500 rounded-full">
                                                  {task.photo_count}
                                                </span>
                                              )}
                                            </Button>
                                            {can("housekeeping.task.assign") && (
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setAssignModal(task)}
                                              >
                                                {t("housekeeping.assign")}
                                              </Button>
                                            )}
                                          </div>
                                        </div>

                                        <span className="hidden md:flex col-span-1 items-center">
                                          <span className="inline-flex items-center justify-center min-w-[28px] h-6 rounded bg-primary-50 text-primary-700 font-bold text-xs shrink-0 px-1.5">
                                            {task.room?.room_number || "?"}
                                          </span>
                                        </span>
                                        <span className="md:hidden flex items-center gap-2 text-sm">
                                          <span className="text-gray-400 min-w-[60px]">{t("housekeeping.type")}:</span>
                                          <Badge variant={task.task_type} />
                                        </span>
                                        <span className="hidden md:block col-span-1">
                                          <Badge variant={task.task_type} className="text-[10px] px-2 py-0.5" />
                                        </span>
                                        <span className="md:hidden flex items-center gap-2 text-sm">
                                          <span className="text-gray-400 min-w-[60px]">{t("housekeeping.priority")}:</span>
                                          <Badge variant={task.priority} />
                                        </span>
                                        <span className="hidden md:block col-span-1">
                                          <Badge variant={task.priority} className="text-[10px] px-2 py-0.5" />
                                        </span>

                                        <span className="md:hidden flex items-center gap-2 text-sm">
                                          <span className="text-gray-500">{t("housekeeping.status")}:</span>
                                          <div className="flex items-center gap-1">
                                            <Badge variant={task.status} />
                                            {can("housekeeping.task.update") &&
                                              (task.status === "OPEN" || task.status === "IN_PROGRESS") && (
                                              <select
                                                className="text-xs border rounded px-1 py-0.5"
                                                value=""
                                                onChange={(e) => {
                                                  if (e.target.value)
                                                    statusMutation.mutate({
                                                      id: task.id,
                                                      status: e.target.value,
                                                    })
                                                }}
                                              >
                                                <option value="">{t("housekeeping.change")}</option>
                                                {task.status === "OPEN" && (
                                                  <option value="IN_PROGRESS">
                                                    {t("housekeeping.start")}
                                                  </option>
                                                )}
                                                {task.status === "IN_PROGRESS" && (
                                                  <option value="COMPLETED">
                                                    {t("housekeeping.complete")}
                                                  </option>
                                                )}
                                                <option value="CANCELLED">
                                                  {t("housekeeping.cancelTask")}
                                                </option>
                                              </select>
                                            )}
                                          </div>
                                        </span>

                                        <span className="hidden md:flex col-span-2 items-center gap-1.5">
                                          <Badge variant={task.status} className="text-[10px] px-2 py-0.5" />
                                          {can("housekeeping.task.update") &&
                                            (task.status === "OPEN" || task.status === "IN_PROGRESS") && (
                                            <select
                                              className="text-[11px] border border-gray-200 rounded-md px-1.5 py-0.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer text-gray-500"
                                              value=""
                                              onChange={(e) => {
                                                if (e.target.value)
                                                  statusMutation.mutate({
                                                    id: task.id,
                                                    status: e.target.value,
                                                  })
                                              }}
                                            >
                                              <option value="">{t("housekeeping.change")}</option>
                                              {task.status === "OPEN" && (
                                                <option value="IN_PROGRESS">
                                                  {t("housekeeping.start")}
                                                </option>
                                              )}
                                              {task.status === "IN_PROGRESS" && (
                                                <option value="COMPLETED">
                                                  {t("housekeeping.complete")}
                                                </option>
                                              )}
                                              <option value="CANCELLED">
                                                {t("housekeeping.cancelTask")}
                                              </option>
                                            </select>
                                          )}
                                        </span>

                                        <div className="md:hidden grid grid-cols-2 gap-1 text-sm">
                                          <span className="text-gray-400 min-w-[60px]">{t("housekeeping.assignedTo")}:</span>
                                          <span className="text-gray-600 truncate">
                                            {task.assigned_user
                                              ? `${task.assigned_user.first_name} ${task.assigned_user.last_name}`
                                              : "-"}
                                          </span>
                                          <span className="text-gray-400 min-w-[60px]">{t("housekeeping.scheduled")}:</span>
                                          <span className="text-gray-500">
                                            {task.scheduled_date ? formatDate(task.scheduled_date) : "-"}
                                          </span>
                                        </div>

                                        <span className="hidden md:flex col-span-2 items-center text-sm text-gray-700 truncate">
                                          {task.assigned_user
                                            ? (<span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />{task.assigned_user.first_name} {task.assigned_user.last_name}</span>)
                                            : (<span className="text-gray-300">-</span>)}
                                        </span>
                                        <span className="hidden md:flex col-span-2 items-center text-xs text-gray-500">
                                          {task.scheduled_date
                                            ? formatDate(task.scheduled_date)
                                            : <span className="text-gray-300">-</span>}
                                        </span>
                                        <span className="hidden md:flex col-span-3 justify-end items-center gap-0.5">
                                          <button
                                            className={cn(
                                              "p-1.5 rounded-lg transition-colors",
                                              task.photo_count > 0
                                                ? "text-blue-600 hover:bg-blue-50"
                                                : "text-gray-300 hover:text-gray-400 hover:bg-gray-50"
                                            )}
                                            title={t("housekeeping.viewPhotos")}
                                            onClick={() => setPhotoModal(task)}
                                          >
                                            <div className="relative">
                                              <ImageIcon className="h-4 w-4" />
                                              {task.photo_count > 0 && (
                                                <span className="absolute -top-1 -right-1.5 inline-flex items-center justify-center min-w-[16px] h-4 text-[10px] font-bold text-white bg-blue-500 rounded-full px-1">
                                                  {task.photo_count}
                                                </span>
                                              )}
                                            </div>
                                          </button>
                                          {can("housekeeping.task.assign") && (
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="text-xs"
                                              onClick={() => setAssignModal(task)}
                                            >
                                              {t("housekeeping.assign")}
                                            </Button>
                                          )}
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
        {hotelTree.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-400">
            <Brush className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t("housekeeping.noTasks", "No housekeeping tasks found")}</p>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("housekeeping.createTask")}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isSuperAdmin && (
            <Select
              id="hotel_id"
              label={t("housekeeping.hotelId") + " *"}
              options={hotelsList.map((h: any) => ({ value: h.id, label: h.name }))}
              placeholder={t("housekeeping.selectHotel", "Select hotel")}
              error={errors.hotel_id?.message}
              {...register("hotel_id")}
            />
          )}
          {!isSuperAdmin && (
            <Input
              id="hotel_id"
              label={t("housekeeping.hotelId")}
              placeholder={t("housekeeping.uuid")}
              disabled
              {...register("hotel_id")}
            />
          )}
          <Select
            id="branch_id"
            label={t("housekeeping.branchId") + " *"}
            options={
              watchedHotelId
                ? visibleBranches
                    .filter((b: any) => b.hotel_id === watchedHotelId)
                    .map((b: any) => ({
                      value: b.id,
                      label: `${b.name}${b.code ? ` (${b.code})` : ""}`,
                    }))
                : visibleBranches.map((b: any) => ({
                    value: b.id,
                    label: `${b.name}${b.code ? ` (${b.code})` : ""}`,
                  }))
            }
            placeholder={t("housekeeping.selectBranch", "Select branch")}
            error={errors.branch_id?.message}
            disabled={!isSuperAdmin && !!branchId}
            {...register("branch_id")}
          />
          <Select
            id="room_id"
            label={t("housekeeping.roomId") + " *"}
            options={roomsList.map((r: any) => ({
              value: r.id,
              label: `${r.room_number}${r.room_type ? ` - ${r.room_type}` : ""}`,
            }))}
            placeholder={t("housekeeping.selectRoom", "Select room")}
            error={errors.room_id?.message}
            disabled={!watchedBranchId}
            {...register("room_id")}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              id="task_type"
              label={t("housekeeping.taskType") + " *"}
              options={[
                { value: "CLEANING", label: t("housekeeping.cleaning") },
                { value: "DEEP_CLEANING", label: t("housekeeping.deepCleaning") },
                { value: "MAINTENANCE", label: t("housekeeping.maintenance") },
                { value: "INSPECTION", label: t("housekeeping.inspection") },
                { value: "TURN_DOWN", label: t("housekeeping.turnDown") },
              ]}
              {...register("task_type")}
            />
            <Select
              id="priority"
              label={t("housekeeping.priority")}
              options={[
                { value: "LOW", label: t("housekeeping.low") },
                { value: "MEDIUM", label: t("housekeeping.medium") },
                { value: "HIGH", label: t("housekeeping.high") },
                { value: "URGENT", label: t("housekeeping.urgent") },
              ]}
              {...register("priority")}
            />
          </div>

          <Select
            id="assigned_to"
            label={t("housekeeping.assignedToUserId")}
            options={[
              { value: "", label: t("housekeeping.unassigned", "None") },
              ...employeesList.map((e: any) => ({
                value: e.id,
                label: `${e.first_name} ${e.last_name}${e.username ? ` (@${e.username})` : ""}`,
              })),
            ]}
            placeholder={t("housekeeping.selectEmployee", "Select employee")}
            {...register("assigned_to")}
          />
          <Input
            id="scheduled_date"
            label={t("housekeeping.scheduledDate")}
            type="date"
            {...register("scheduled_date")}
          />
          <Input id="notes" label={t("housekeeping.notes")} {...register("notes")} />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {t("housekeeping.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {t("housekeeping.create")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!assignModal}
        onClose={() => setAssignModal(null)}
        title={`${t("housekeeping.assignTask")}: ${t("housekeeping.room")} ${assignModal?.room?.room_number || t("housekeeping.na")}`}
        size="sm"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const form = e.target as HTMLFormElement
            const userId = (form.elements.namedItem("user_id") as HTMLSelectElement).value
            if (userId) assignMutation.mutate({ id: assignModal!.id, userId })
          }}
          className="space-y-4"
        >
          <Select
            id="user_id"
            label={t("housekeeping.userRequired")}
            options={employeesList.map((e: any) => ({
              value: e.id,
              label: `${e.first_name} ${e.last_name}${e.username ? ` (@${e.username})` : ""}`,
            }))}
            placeholder={t("housekeeping.selectEmployee", "Select employee")}
          />
          <div className="flex justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setAssignModal(null)}>
              {t("housekeeping.cancel")}
            </Button>
            <Button type="submit" disabled={assignMutation.isPending}>
              {t("housekeeping.assign")}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!photoModal}
        onClose={() => setPhotoModal(null)}
        title={`${t("housekeeping.photoReport")}: ${t("housekeeping.room")} ${photoModal?.room?.room_number || t("housekeeping.na")}`}
        size="lg"
      >
        {photosLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : taskPhotos && taskPhotos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {taskPhotos.map((photo: TaskPhoto) => (
              <div
                key={photo.id}
                className="block rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow"
              >
                <PhotoImage taskId={photoModal!.id} photoId={photo.id} fileName={photo.file_name} />
                <div className="p-2 text-xs text-gray-500 truncate">
                  {photo.file_name}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t("housekeeping.noPhotos")}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
