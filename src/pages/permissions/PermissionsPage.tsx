import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronDown, ChevronRight, Search, X, Building2, Users, Shield } from "lucide-react"
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
  getPermissions,
  getUserPermissions,
  setUserPermissions,
} from "@/api/modules/permissions"
import type { Permission, Employee } from "@/types/auth"
import { getEmployees } from "@/api/modules/employees"
import { getHotels } from "@/api/modules/hotels"
import { extractItems } from "@/lib/form"
import { cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

export function PermissionsPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId } = useScope()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())
  const [selectedUser, setSelectedUser] = useState<Employee | null>(null)
  const [permModal, setPermModal] = useState(false)
  const [selectedPerms, setSelectedPerms] = useState<string[]>([])

  const { data: permsData, isLoading: permsLoading } = useQuery<Permission[]>({
    queryKey: ["permissions"],
    queryFn: () => getPermissions(),
  })

  const { data: employeesData, isLoading: empLoading } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: () => getEmployees(scopeMerge()),
  })

  const { data: hotelsData } = useQuery({
    queryKey: ["hotels", "select"],
    queryFn: () => getHotels({ page_size: "200" }),
    enabled: isSuperAdmin,
  })

  const { data: userPerms } = useQuery({
    queryKey: ["user-permissions", selectedUser?.id],
    queryFn: () => (selectedUser ? getUserPermissions(selectedUser.id) : null),
    enabled: !!selectedUser,
  })

  const setPermsMutation = useMutation({
    mutationFn: ({ userId, permIds }: { userId: string; permIds: string[] }) =>
      setUserPermissions(userId, permIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] })
      setPermModal(false)
    },
  })

  const openPermModal = (emp: Employee) => {
    setSelectedUser(emp)
    setSelectedPerms([])
    setPermModal(true)
  }

  const employees = extractItems<Employee>(employeesData)
  const permissions = extractItems<Permission>(permsData)

  const hotelsList = useMemo(() => {
    const raw = (hotelsData as any)?.items ?? (Array.isArray(hotelsData) ? hotelsData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [hotelsData])

  const q = search.toLowerCase().trim()

  const hotelTree = useMemo(() => {
    if (!isSuperAdmin) return []
    return hotelsList
      .map((hotel: any) => {
        let emps = employees.filter((e) => e.hotel_id === hotel.id)
        if (q) {
          emps = emps.filter(
            (e) =>
              e.first_name.toLowerCase().includes(q) ||
              e.last_name.toLowerCase().includes(q) ||
              e.username.toLowerCase().includes(q)
          )
          if (emps.length === 0 && !hotel.name.toLowerCase().includes(q)) return null
        }
        return { hotel, employees: emps }
      })
      .filter(Boolean) as { hotel: any; employees: Employee[] }[]
  }, [hotelsList, employees, q, isSuperAdmin])

  const toggleHotel = (id: string) => {
    setExpandedHotels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const groupedPermissions = permissions.reduce(
    (acc, p) => {
      if (!acc[p.module]) acc[p.module] = []
      acc[p.module].push(p)
      return acc
    },
    {} as Record<string, Permission[]>
  )

  const togglePerm = (permId: string) => {
    setSelectedPerms((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    )
  }

  const columns: Column<Employee>[] = [
    {
      key: "name",
      header: t("permissions.name"),
      render: (e) => `${e.first_name} ${e.last_name}`,
    },
    { key: "username", header: t("permissions.username") },
    {
      key: "user_type",
      header: t("permissions.role"),
      render: (e) => <Badge variant={e.user_type} />,
    },
    {
      key: "actions",
      header: "",
      render: (e) => (
        <Button variant="ghost" size="sm" onClick={() => openPermModal(e)}>
          {t("permissions.managePermissions")}
        </Button>
      ),
    },
  ]

  const visibleEmployees = isSuperAdmin
    ? employees
    : employees.filter((e) => e.hotel_id === hotelId)

  if (permsLoading || empLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("permissions.title")}</h1>
        <p className="text-gray-500 mt-1">{t("permissions.subtitle")}</p>
      </div>

      {isSuperAdmin ? (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("permissions.searchPlaceholder", "Search employees...")}
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
            {hotelTree.map(({ hotel, employees: hotelEmps }) => {
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
                      {hotelEmps.length} {t("permissions.employees", "employees")}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {hotelEmps.length === 0 ? (
                        <div className="p-4 text-sm text-gray-400 text-center">
                          {t("permissions.noEmployees")}
                        </div>
                      ) : (
                        <div className="p-2">
                          <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-medium text-gray-400 uppercase border-b border-gray-100">
                            <span className="col-span-4">{t("permissions.name")}</span>
                            <span className="col-span-3">{t("permissions.username")}</span>
                            <span className="col-span-2">{t("permissions.role")}</span>
                            <span className="col-span-3" />
                          </div>
                          {hotelEmps.map((emp) => (
                            <div
                              key={emp.id}
                              className={cn(
                                "grid grid-cols-12 gap-2 px-3 py-2 rounded-md items-center",
                                "hover:bg-gray-50 transition-colors"
                              )}
                            >
                              <span className="col-span-4 font-medium text-gray-900 text-sm truncate">
                                {emp.first_name} {emp.last_name}
                              </span>
                              <span className="col-span-3 text-sm text-gray-600 truncate">
                                @{emp.username}
                              </span>
                              <span className="col-span-2">
                                <Badge variant={emp.user_type} />
                              </span>
                              <span className="col-span-3 flex justify-end">
                                <Button variant="ghost" size="sm" onClick={() => openPermModal(emp)}>
                                  {t("permissions.managePermissions")}
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
            {hotelTree.length === 0 && employees.length > 0 && (
              <div className="text-center py-12 text-gray-400">
                <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>{t("permissions.noEmployees")}</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <DataTable
              columns={columns}
              data={visibleEmployees}
              keyField="id"
              isLoading={empLoading}
              emptyMessage={t("permissions.noEmployees")}
            />
          </CardContent>
        </Card>
      )}

      <Modal
        open={permModal}
        onClose={() => setPermModal(false)}
        title={`${t("permissions.permissionsFor")}: ${selectedUser?.first_name} ${selectedUser?.last_name}`}
        size="lg"
      >
        <div className="space-y-6">
          {userPerms && (
            <p className="text-sm text-gray-600">
              {t("permissions.currentlyAssigned", { count: userPerms.length })}
            </p>
          )}

          {Object.entries(groupedPermissions).map(([module, perms]) => (
            <div key={module}>
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-2">{module}</h4>
              <div className="space-y-2">
                {perms.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPerms.includes(p.id)}
                      onChange={() => togglePerm(p.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.code}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setPermModal(false)}>
              {t("permissions.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  setPermsMutation.mutate({
                    userId: selectedUser.id,
                    permIds: selectedPerms,
                  })
                }
              }}
              disabled={setPermsMutation.isPending}
            >
              {t("permissions.savePermissions")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
