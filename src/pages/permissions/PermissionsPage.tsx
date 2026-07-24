import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { ChevronDown, ChevronRight, Search, X, Building2, Shield } from "lucide-react"
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
  syncUserPermissions,
} from "@/api/modules/permissions"
import type { Permission, Employee } from "@/types/auth"
import { getEmployees } from "@/api/modules/employees"
import { getHotels } from "@/api/modules/hotels"
import { extractItems } from "@/lib/form"
import { apiErrorMessage, cn } from "@/lib/utils"
import {
  PERMISSION_TEMPLATES,
  findMatchingTemplate,
  templatePermissionIds,
} from "@/lib/permissionTemplates"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"
import { usePermissions } from "@/lib/permissions"

export function PermissionsPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId } = useScope()
  const { can } = usePermissions()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())
  const [selectedUser, setSelectedUser] = useState<Employee | null>(null)
  const [permModal, setPermModal] = useState(false)
  const [permDraft, setPermDraft] = useState<string[] | null>(null)

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

  const { data: userPerms, isLoading: userPermsLoading } = useQuery({
    queryKey: ["user-permissions", selectedUser?.id],
    queryFn: () => (selectedUser ? getUserPermissions(selectedUser.id) : []),
    enabled: !!selectedUser,
  })

  const setPermsMutation = useMutation({
    mutationFn: ({
      userId,
      permIds,
      currentIds,
    }: {
      userId: string
      permIds: string[]
      currentIds: string[]
    }) => syncUserPermissions(userId, permIds, currentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions"] })
      setPermModal(false)
    },
  })

  const openPermModal = (emp: Employee) => {
    setPermsMutation.reset()
    setSelectedUser(emp)
    setPermDraft(null)
    setPermModal(true)
  }

  const employees = extractItems<Employee>(employeesData)
  const permissions = extractItems<Permission>(permsData)

  // what the employee already has; the draft stays null until something is edited,
  // so the modal always opens on the current server state
  const assignedIds = (userPerms ?? []).map((p) => p.id).filter(Boolean)
  const selectedPerms = permDraft ?? assignedIds

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
    const next = selectedPerms.includes(permId)
      ? selectedPerms.filter((id) => id !== permId)
      : [...selectedPerms, permId]
    setPermDraft(next)
  }

  const toggleModule = (perms: Permission[]) => {
    const ids = perms.map((p) => p.id)
    const allSelected = ids.every((id) => selectedPerms.includes(id))
    setPermDraft(
      allSelected
        ? selectedPerms.filter((id) => !ids.includes(id))
        : [...new Set([...selectedPerms, ...ids])]
    )
  }

  const templates = PERMISSION_TEMPLATES.map((template) => ({
    template,
    ids: templatePermissionIds(template, permissions),
  })).filter((entry) => entry.ids.length > 0)

  const activeTemplateId = findMatchingTemplate(selectedPerms, permissions)?.id ?? null

  const added = selectedPerms.filter((id) => !assignedIds.includes(id)).length
  const removed = assignedIds.filter((id) => !selectedPerms.includes(id)).length
  const hasChanges = added > 0 || removed > 0

  const errorMessage = apiErrorMessage(setPermsMutation.error)

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
      render: (e) =>
        can("permission.assign") ? (
          <Button variant="ghost" size="sm" onClick={() => openPermModal(e)}>
            {t("permissions.managePermissions")}
          </Button>
        ) : null,
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
                                {can("permission.assign") && (
                                  <Button variant="ghost" size="sm" onClick={() => openPermModal(emp)}>
                                    {t("permissions.managePermissions")}
                                  </Button>
                                )}
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
        size="xl"
      >
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">
                  {t("permissions.templateTitle")}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t("permissions.templateHint")}
                </p>
              </div>
              {selectedPerms.length > 0 && !activeTemplateId && (
                <span className="shrink-0 rounded-full bg-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                  {t("permissions.templateCustom")}
                </span>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map(({ template, ids }) => {
                const Icon = template.icon
                const isActive = activeTemplateId === template.id
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setPermDraft(ids)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border bg-white p-3 text-left transition-colors",
                      isActive
                        ? "border-primary-500 ring-1 ring-primary-500"
                        : "border-gray-200 hover:border-primary-300 hover:bg-primary-50/40"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                        template.accent
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900">
                        {t(`permissions.templates.${template.id}.name`)}
                      </span>
                      <span className="block text-xs text-gray-500 leading-snug">
                        {t(`permissions.templates.${template.id}.description`)}
                      </span>
                      <span className="mt-1 block text-xs font-medium text-gray-400">
                        {t("permissions.permCount", { count: ids.length })}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPermDraft(permissions.map((p) => p.id))}
              >
                {t("permissions.selectAll")}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPermDraft([])}>
                {t("permissions.clearAll")}
              </Button>
              <span className="ml-auto text-xs text-gray-500">
                {t("permissions.selectedCount", {
                  count: selectedPerms.length,
                  total: permissions.length,
                })}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            {userPermsLoading
              ? t("permissions.loadingCurrent")
              : t("permissions.currentlyAssigned", { count: assignedIds.length })}
          </p>

          {Object.entries(groupedPermissions).map(([module, perms]) => {
            const selectedInModule = perms.filter((p) =>
              selectedPerms.includes(p.id)
            ).length
            return (
              <div key={module}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase">
                    {t(`permissions.modules.${module}`, { defaultValue: module })}
                    <span className="ml-2 text-xs font-normal normal-case text-gray-400">
                      {selectedInModule}/{perms.length}
                    </span>
                  </h4>
                  <Button variant="ghost" size="sm" onClick={() => toggleModule(perms)}>
                    {selectedInModule === perms.length
                      ? t("permissions.clearAll")
                      : t("permissions.selectAll")}
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {perms.map((p) => {
                    const isSelected = selectedPerms.includes(p.id)
                    const wasAssigned = assignedIds.includes(p.id)
                    const isChanged = isSelected !== wasAssigned
                    return (
                      <label
                        key={p.id}
                        className={cn(
                          "flex items-center gap-3 py-2 px-3 rounded-lg border cursor-pointer transition-colors",
                          isSelected
                            ? "border-primary-200 bg-primary-50/50"
                            : "border-gray-200 hover:bg-gray-50",
                          isChanged && (isSelected ? "border-emerald-300" : "border-red-300")
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePerm(p.id)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                          <p className="text-xs text-gray-500 truncate">{p.code}</p>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            {hasChanges && (
              <span className="mr-auto text-xs text-gray-500">
                {added > 0 && <span className="text-emerald-600 font-medium">+{added}</span>}
                {added > 0 && removed > 0 && " / "}
                {removed > 0 && <span className="text-red-600 font-medium">−{removed}</span>}
              </span>
            )}
            <Button variant="secondary" onClick={() => setPermModal(false)}>
              {t("permissions.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  setPermsMutation.mutate({
                    userId: selectedUser.id,
                    permIds: selectedPerms,
                    currentIds: assignedIds,
                  })
                }
              }}
              disabled={setPermsMutation.isPending || userPermsLoading || !hasChanges}
            >
              {t("permissions.savePermissions")}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
