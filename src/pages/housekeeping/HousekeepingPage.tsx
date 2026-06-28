import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, ChevronDown, ChevronRight, Search, X, Building2, DoorOpen, Brush } from "lucide-react"
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
  PageLoader,
} from "@/components/ui"
import {
  getHousekeepingTasks,
  createHousekeepingTask,
  updateHousekeepingTask,
  updateHousekeepingTaskStatus,
  assignHousekeepingTask,
} from "@/api/modules/housekeeping"
import type { HousekeepingTask, HousekeepingTaskCreateRequest } from "@/types/housekeeping"
import { getHotels } from "@/api/modules/hotels"
import { getBranches } from "@/api/modules/branches"
import { formatDate, cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

export function HousekeepingPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId, branchId } = useScope()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [assignModal, setAssignModal] = useState<HousekeepingTask | null>(null)

  const taskSchema = z.object({
    hotel_id: z.string().min(1, t("housekeeping.hotelRequired")),
    branch_id: z.string().min(1, t("housekeeping.branchRequired")),
    room_id: z.string().min(1, t("housekeeping.roomRequired")),
    task_type: z.enum(["CLEANING", "MAINTENANCE", "INSPECTION", "TURN_DOWN"]),
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
    formState: { errors },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { task_type: "CLEANING", priority: "MEDIUM" },
  })

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("housekeeping.title")}</h1>
          <p className="text-gray-500 mt-1">{t("housekeeping.subtitle")}</p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4" />
          {t("housekeeping.newTask")}
        </Button>
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
                  {branches.length} {t("rooms.branch")} / {totalTasks} {t("housekeeping.title")}
                </span>
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
              </button>

              {isHotelExpanded && (
                <div className="border-t border-gray-100">
                  {branches.length === 0 ? (
                    <div className="p-4 text-sm text-gray-400 text-center">
                      {t("housekeeping.noTasks", "No tasks")}
                    </div>
                  ) : (
                    <div className="space-y-1 p-2">
                      {branches.map(({ branch, tasks }) => {
                        const isBranchExpanded = expandedBranches.has(branch.id)
                        const branchTasks = getTasksForBranch(branch.id)

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
                                {branchTasks.length} {t("housekeeping.title")}
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
                                {branchTasks.length === 0 ? (
                                  <div className="py-3 text-sm text-gray-400">
                                    {t("housekeeping.noTasks", "No tasks")}
                                  </div>
                                ) : (
                                  <div className="space-y-1 py-1">
                                    <div className="grid grid-cols-12 gap-2 px-3 py-1 text-xs font-medium text-gray-400 uppercase">
                                      <span className="col-span-2">{t("housekeeping.room")}</span>
                                      <span className="col-span-1">{t("housekeeping.type")}</span>
                                      <span className="col-span-1">{t("housekeeping.priority")}</span>
                                      <span className="col-span-2">{t("housekeeping.status")}</span>
                                      <span className="col-span-2">{t("housekeeping.assignedTo")}</span>
                                      <span className="col-span-2">{t("housekeeping.scheduled")}</span>
                                      <span className="col-span-2" />
                                    </div>
                                    {branchTasks.map((task) => (
                                      <div
                                        key={task.id}
                                        className={cn(
                                          "grid grid-cols-12 gap-2 px-3 py-2 rounded-md items-center",
                                          "hover:bg-gray-50 transition-colors"
                                        )}
                                      >
                                        <span className="col-span-2 font-medium text-gray-900 text-sm">
                                          {task.room?.room_number || t("housekeeping.na")}
                                        </span>
                                        <span className="col-span-1">
                                          <Badge variant={task.task_type} />
                                        </span>
                                        <span className="col-span-1">
                                          <Badge variant={task.priority} />
                                        </span>
                                        <span className="col-span-2">
                                          <div className="flex items-center gap-1">
                                            <Badge variant={task.status} />
                                            {(task.status === "OPEN" || task.status === "IN_PROGRESS") && (
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
                                        <span className="col-span-2 text-sm text-gray-600 truncate">
                                          {task.assigned_user
                                            ? `${task.assigned_user.first_name} ${task.assigned_user.last_name}`
                                            : "-"}
                                        </span>
                                        <span className="col-span-2 text-xs text-gray-500">
                                          {task.scheduled_date
                                            ? formatDate(task.scheduled_date)
                                            : "-"}
                                        </span>
                                        <span className="col-span-2 flex justify-end">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setAssignModal(task)}
                                          >
                                            {t("housekeeping.assign")}
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="hotel_id"
              label={t("housekeeping.hotelId") + " *"}
              placeholder={t("housekeeping.uuid")}
              error={errors.hotel_id?.message}
              disabled={!isSuperAdmin}
              {...register("hotel_id")}
            />
            <Input
              id="branch_id"
              label={t("housekeeping.branchId") + " *"}
              placeholder={t("housekeeping.uuid")}
              error={errors.branch_id?.message}
              {...register("branch_id")}
            />
          </div>

          <Input
            id="room_id"
            label={t("housekeeping.roomId") + " *"}
            placeholder={t("housekeeping.uuid")}
            error={errors.room_id?.message}
            {...register("room_id")}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="task_type"
              label={t("housekeeping.taskType") + " *"}
              options={[
                { value: "CLEANING", label: t("housekeeping.cleaning") },
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

          <Input
            id="assigned_to"
            label={t("housekeeping.assignedToUserId")}
            placeholder={t("housekeeping.uuid")}
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
            const userId = (form.elements.namedItem("user_id") as HTMLInputElement).value
            assignMutation.mutate({ id: assignModal!.id, userId })
          }}
          className="space-y-4"
        >
          <Input
            id="user_id"
            label={t("housekeeping.userRequired")}
            placeholder={t("housekeeping.enterEmployeeUuid")}
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
    </div>
  )
}
