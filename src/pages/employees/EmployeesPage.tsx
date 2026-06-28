import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, ChevronDown, ChevronRight, Search, X, Building2, Users } from "lucide-react"
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
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "@/api/modules/employees"
import { getHotels } from "@/api/modules/hotels"
import { getBranches } from "@/api/modules/branches"
import type { Employee, EmployeeCreateRequest } from "@/types/auth"
import { formatDate, cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

export function EmployeesPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId } = useScope()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null)

  const employeeSchema = z.object({
    user_type: z.enum(["SUPER_ADMIN", "ADMIN", "EMPLOYEE"]),
    hotel_id: z.string().optional(),
    branch_id: z.string().optional(),
    username: z.string().min(3, t("employees.usernameMin")),
    password: z.string().min(6, t("employees.passwordMin")),
    first_name: z.string().min(1, t("employees.firstNameRequired")),
    last_name: z.string().min(1, t("employees.lastNameRequired")),
    email: z.string().email(t("employees.invalidEmail")).optional().or(z.literal("")),
    phone: z.string().optional(),
    hire_date: z.string().optional(),
  })

  type EmployeeForm = z.infer<typeof employeeSchema>

  const { data: hotelsData } = useQuery({
    queryKey: ["hotels", "select"],
    queryFn: () => getHotels({ page_size: "200" }),
  })

  const { data: employeesData, isLoading } = useQuery({
    queryKey: ["employees", "all"],
    queryFn: () => getEmployees(scopeMerge({ page_size: "2000" })),
  })

  const { data: branchesData } = useQuery({
    queryKey: ["branches", "dropdown"],
    queryFn: () => getBranches({ page_size: "500" }),
  })

  const hotelsList = useMemo(() => {
    const raw = (hotelsData as any)?.items ?? (Array.isArray(hotelsData) ? hotelsData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [hotelsData])

  const allEmployees: Employee[] = useMemo(() => {
    const raw = (employeesData as any)?.data ?? employeesData
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [employeesData])

  const allBranches = useMemo(() => {
    const raw = (branchesData as any)?.data ?? branchesData ?? []
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [branchesData])

  const visibleHotels = useMemo(() => {
    if (!isSuperAdmin && hotelId) return hotelsList.filter((h: any) => h.id === hotelId)
    return hotelsList
  }, [hotelsList, isSuperAdmin, hotelId])

  const q = search.toLowerCase().trim()

  const hotelTree = useMemo(() => {
    return visibleHotels
      .map((hotel: any) => {
        let emps = allEmployees.filter((e) => e.hotel_id === hotel.id)
        if (q) {
          emps = emps.filter(
            (e) =>
              e.first_name.toLowerCase().includes(q) ||
              e.last_name.toLowerCase().includes(q) ||
              e.username.toLowerCase().includes(q) ||
              e.phone?.includes(q) ||
              e.email?.toLowerCase().includes(q)
          )
          if (emps.length === 0 && !hotel.name.toLowerCase().includes(q)) return null
        }
        return { hotel, employees: emps }
      })
      .filter(Boolean) as { hotel: any; employees: Employee[] }[]
  }, [visibleHotels, allEmployees, q])

  const toggleHotel = (id: string) => {
    setExpandedHotels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      setModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      setModalOpen(false)
      setEditingEmp(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
  })

  const watchedHotelId = watch("hotel_id")
  const hotelField = register("hotel_id")

  const branchNameMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const b of allBranches) map.set(b.id, b.name)
    return map
  }, [allBranches])

  const hotelOptions = hotelsList.map((h: any) => ({ value: h.id, label: h.name }))

  const branchOptions = allBranches
    .filter((b: any) => !watchedHotelId || b.hotel_id === watchedHotelId)
    .map((b: any) => ({ value: b.id, label: b.name }))

  const openCreate = (hId?: string) => {
    const today = new Date().toISOString().split("T")[0]
    reset({
      user_type: "EMPLOYEE",
      username: "",
      password: "",
      first_name: "",
      last_name: "",
      hotel_id: hId || hotelId || "",
      hire_date: today,
    })
    setEditingEmp(null)
    setModalOpen(true)
  }

  const openEdit = (emp: Employee) => {
    reset({
      user_type: emp.user_type,
      hotel_id: emp.hotel_id || "",
      branch_id: emp.branch_id || "",
      username: emp.username,
      password: "",
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email || "",
      phone: emp.phone || "",
      hire_date: emp.hire_date || "",
    })
    setEditingEmp(emp)
    setModalOpen(true)
  }

  const onSubmit = (values: EmployeeForm) => {
    if (editingEmp) {
      const { password, username, user_type, ...updateData } = values
      updateMutation.mutate({ id: editingEmp.id, data: { ...updateData, user_type } })
    } else {
      createMutation.mutate(values as EmployeeCreateRequest)
    }
  }

  if (isLoading && allEmployees.length === 0) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("employees.title")}</h1>
          <p className="text-gray-500 mt-1">{t("employees.subtitle")}</p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4" />
          {t("employees.addEmployee")}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("employees.searchPlaceholder")}
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
        {hotelTree.map(({ hotel, employees }) => {
          const isExpanded = expandedHotels.has(hotel.id)

          return (
            <Card key={hotel.id}>
              <button
                onClick={() => toggleHotel(hotel.id)}
                className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors rounded-lg text-left"
              >
                {isExpanded ? (
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
                  {employees.length} {t("employees.title")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isExpanded) toggleHotel(hotel.id)
                    openCreate(hotel.id)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100">
                  {employees.length === 0 ? (
                    <div className="p-4 text-sm text-gray-400 text-center">
                      {t("employees.noEmployees", "No employees")}
                    </div>
                  ) : (
                    <div className="p-2">
                      <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-medium text-gray-400 uppercase border-b border-gray-100">
                        <span className="col-span-3">{t("employees.name")}</span>
                        <span className="col-span-2">{t("employees.role")}</span>
                        <span className="col-span-2">{t("employees.status")}</span>
                        <span className="col-span-2">{t("employees.phone")}</span>
                        <span className="col-span-1">{t("rooms.branch")}</span>
                        <span className="col-span-2" />
                      </div>
                      {employees.map((emp) => (
                        <div
                          key={emp.id}
                          className={cn(
                            "grid grid-cols-12 gap-2 px-3 py-2 rounded-md items-center",
                            "hover:bg-gray-50 transition-colors"
                          )}
                        >
                          <div className="col-span-3 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {emp.first_name} {emp.last_name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">@{emp.username}</p>
                          </div>
                          <span className="col-span-2">
                            <Badge variant={emp.user_type} />
                          </span>
                          <span className="col-span-2">
                            <Badge variant={emp.status} />
                          </span>
                          <span className="col-span-2 text-sm text-gray-600 truncate">
                            {emp.phone || "-"}
                          </span>
                          <span className="col-span-1 text-xs text-gray-500 truncate">
                            {emp.branch_id ? (branchNameMap.get(emp.branch_id) || "-") : "-"}
                          </span>
                          <span className="col-span-2 flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(emp)}
                            >
                              {t("employees.edit")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
                              onClick={() => {
                                if (confirm(t("employees.deleteConfirm")))
                                  deleteMutation.mutate(emp.id)
                              }}
                            >
                              {t("employees.delete")}
                            </Button>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
        {hotelTree.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t("employees.noEmployees", "No employees found")}</p>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingEmp(null)
        }}
        title={editingEmp ? t("employees.editEmployee") : t("employees.createEmployee")}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="first_name"
              label={t("employees.firstName") + " *"}
              error={errors.first_name?.message}
              {...register("first_name")}
            />
            <Input
              id="last_name"
              label={t("employees.lastName") + " *"}
              error={errors.last_name?.message}
              {...register("last_name")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="username"
              label={t("employees.username") + " *"}
              error={errors.username?.message}
              {...register("username")}
            />
            <Select
              id="user_type"
              label={t("employees.role") + " *"}
              options={[
                { value: "SUPER_ADMIN", label: t("employees.superAdmin") },
                { value: "ADMIN", label: t("employees.admin") },
                { value: "EMPLOYEE", label: t("employees.employee") },
              ]}
              {...register("user_type")}
            />
          </div>

          {!editingEmp && (
            <Input
              id="password"
              label={t("employees.password") + " *"}
              type="password"
              error={errors.password?.message}
              {...register("password")}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="email"
              label={t("employees.email")}
              error={errors.email?.message}
              {...register("email")}
            />
            <Input id="phone" label={t("employees.phone")} {...register("phone")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="hotel_id"
              label={t("employees.hotelId")}
              placeholder={t("employees.selectHotel")}
              options={hotelOptions}
              disabled={!isSuperAdmin}
              {...hotelField}
              onChange={(e) => {
                hotelField.onChange(e)
                setValue("branch_id", "")
              }}
            />
            <Select
              id="branch_id"
              label={t("employees.branchId")}
              placeholder={t("employees.selectBranch")}
              options={branchOptions}
              disabled={!watchedHotelId}
              {...register("branch_id")}
            />
          </div>

          <Input
            id="hire_date"
            label={t("employees.hireDate")}
            type="date"
            {...register("hire_date")}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {t("employees.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingEmp ? t("employees.update") : t("employees.create")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
