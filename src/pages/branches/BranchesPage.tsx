import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, ChevronDown, ChevronRight, Search, X, Building2, GitBranch } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Button,
  Input,
  Select,
  Badge,
  Card,
  Modal,
  PageLoader,
} from "@/components/ui"
import {
  getBranches,
  createBranch,
  updateBranch,
} from "@/api/modules/branches"
import { getHotels } from "@/api/modules/hotels"
import type { Branch, BranchCreateRequest, BranchUpdateRequest } from "@/types/branch"
import { formatDate, cn } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

export function BranchesPage() {
  const { t } = useTranslation()
  const { scopeMerge, isSuperAdmin, hotelId } = useScope()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState("")
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)

  const branchSchema = z.object({
    hotel_id: z.string().min(1, t("branches.hotelRequired")),
    name: z.string().min(1, t("branches.nameRequired")),
    code: z.string().min(1, t("branches.codeRequired")),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    postal_code: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email(t("guests.invalidEmail")).optional().or(z.literal("")),
  })

  type BranchForm = z.infer<typeof branchSchema>

  const { data: hotelsData } = useQuery({
    queryKey: ["hotels", "select"],
    queryFn: () => getHotels({ page_size: "200" }),
  })

  const { data: allBranchesData, isLoading } = useQuery({
    queryKey: ["branches", "all"],
    queryFn: () => getBranches(scopeMerge({ page_size: "2000" })),
  })

  const hotelsList = useMemo(() => {
    const raw = (hotelsData as any)?.items ?? (Array.isArray(hotelsData) ? hotelsData : [])
    return Array.isArray(raw) ? raw : (raw as any)?.items ?? []
  }, [hotelsData])

  const allBranches: Branch[] = useMemo(
    () => (Array.isArray(allBranchesData) ? allBranchesData : (allBranchesData as any)?.items ?? []),
    [allBranchesData]
  )

  const hotelOptions = useMemo(
    () => hotelsList.map((h: any) => ({ value: h.id, label: h.name })),
    [hotelsList]
  )

  const visibleHotels = useMemo(() => {
    if (!isSuperAdmin && hotelId) return hotelsList.filter((h: any) => h.id === hotelId)
    return hotelsList
  }, [hotelsList, isSuperAdmin, hotelId])

  const q = search.toLowerCase().trim()

  const hotelTree = useMemo(() => {
    return visibleHotels
      .map((hotel: any) => {
        let branches = allBranches.filter((b) => b.hotel_id === hotel.id)
        if (q) {
          branches = branches.filter(
            (b) =>
              b.name.toLowerCase().includes(q) ||
              b.code.toLowerCase().includes(q) ||
              b.city?.toLowerCase().includes(q)
          )
          if (branches.length === 0 && !hotel.name.toLowerCase().includes(q)) return null
        }
        return { hotel, branches }
      })
      .filter(Boolean) as { hotel: any; branches: Branch[] }[]
  }, [visibleHotels, allBranches, q])

  const toggleHotel = (id: string) => {
    setExpandedHotels((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      setModalOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: BranchUpdateRequest }) =>
      updateBranch(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] })
      setModalOpen(false)
      setEditingBranch(null)
    },
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema),
  })

  const openCreate = (hId?: string) => {
    reset({ name: "", code: "", hotel_id: hId || hotelId || "" })
    setEditingBranch(null)
    setModalOpen(true)
  }

  const openEdit = (branch: Branch) => {
    reset({
      hotel_id: branch.hotel_id,
      name: branch.name,
      code: branch.code,
      address: branch.address || "",
      city: branch.city || "",
      state: branch.state || "",
      country: branch.country || "",
      postal_code: branch.postal_code || "",
      phone: branch.phone || "",
      email: branch.email || "",
    })
    setEditingBranch(branch)
    setModalOpen(true)
  }

  const onSubmit = (values: BranchForm) => {
    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, data: values as BranchUpdateRequest })
    } else {
      createMutation.mutate(values as BranchCreateRequest)
    }
  }

  if (isLoading && allBranches.length === 0) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("branches.title")}</h1>
          <p className="text-gray-500 mt-1">{t("branches.subtitle")}</p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus className="h-4 w-4" />
          {t("branches.addBranch")}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("branches.searchPlaceholder")}
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
                  {branches.length} {t("branches.title")}
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
                  {branches.length === 0 ? (
                    <div className="p-4 text-sm text-gray-400 text-center">
                      {t("branches.noBranches", "No branches")}
                    </div>
                  ) : (
                    <div className="p-2">
                      <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-medium text-gray-400 uppercase border-b border-gray-100">
                        <span className="col-span-2">{t("branches.name")}</span>
                        <span className="col-span-1">{t("branches.code")}</span>
                        <span className="col-span-1">{t("branches.main")}</span>
                        <span className="col-span-2">{t("branches.city")}</span>
                        <span className="col-span-1">{t("branches.status")}</span>
                        <span className="col-span-2">{t("branches.phone")}</span>
                        <span className="col-span-2">{t("branches.created")}</span>
                        <span className="col-span-1" />
                      </div>
                      {branches.map((branch) => (
                        <div
                          key={branch.id}
                          className={cn(
                            "grid grid-cols-12 gap-2 px-3 py-2 rounded-md items-center",
                            "hover:bg-gray-50 transition-colors"
                          )}
                        >
                          <span className="col-span-2 font-medium text-gray-900 text-sm truncate">
                            {branch.name}
                          </span>
                          <span className="col-span-1 text-xs text-gray-500 font-mono">
                            {branch.code}
                          </span>
                          <span className="col-span-1 text-xs text-gray-500">
                            {branch.is_main_branch ? t("branches.yes") : t("branches.no")}
                          </span>
                          <span className="col-span-2 text-sm text-gray-600 truncate">
                            {branch.city || "-"}
                          </span>
                          <span className="col-span-1">
                            <Badge variant={branch.status} />
                          </span>
                          <span className="col-span-2 text-sm text-gray-600 truncate">
                            {branch.phone || "-"}
                          </span>
                          <span className="col-span-2 text-xs text-gray-500">
                            {formatDate(branch.created_at)}
                          </span>
                          <span className="col-span-1 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(branch)}
                            >
                              {t("branches.edit")}
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
            <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>{t("branches.noBranches", "No branches found")}</p>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setEditingBranch(null)
        }}
        title={editingBranch ? t("branches.editBranch") : t("branches.createBranch")}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isSuperAdmin ? (
            <Select
              id="hotel_id"
              label={t("branches.hotelId") + " *"}
              options={hotelOptions}
              placeholder={t("branches.selectHotel", "Select hotel")}
              error={errors.hotel_id?.message}
              {...register("hotel_id")}
            />
          ) : (
            <Input
              id="hotel_id"
              label={t("branches.hotelId") + " *"}
              placeholder={t("branches.enterHotelUuid")}
              error={errors.hotel_id?.message}
              disabled
              {...register("hotel_id")}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              id="name"
              label={t("branches.name") + " *"}
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              id="code"
              label={t("branches.code") + " *"}
              error={errors.code?.message}
              {...register("code")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input id="phone" label={t("branches.phone")} {...register("phone")} />
            <Input id="email" label={t("branches.email")} error={errors.email?.message} {...register("email")} />
          </div>

          <Input id="address" label={t("branches.address")} {...register("address")} />

          <div className="grid grid-cols-2 gap-4">
            <Input id="city" label={t("branches.city")} {...register("city")} />
            <Input id="state" label={t("branches.state")} {...register("state")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input id="country" label={t("branches.country")} {...register("country")} />
            <Input id="postal_code" label={t("branches.postalCode")} {...register("postal_code")} />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              {t("branches.cancel")}
            </Button>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingBranch ? t("branches.update") : t("branches.create")}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
