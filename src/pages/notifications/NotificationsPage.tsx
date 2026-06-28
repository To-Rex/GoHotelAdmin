import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Bell, Check } from "lucide-react"
import {
  Button,
  Card,
  CardContent,
  PageLoader,
} from "@/components/ui"
import { getNotifications, markNotificationRead } from "@/api/modules/reports"
import type { Notification } from "@/types/other"
import { formatDateTime } from "@/lib/utils"
import { useTranslation } from "react-i18next"
import { useScope } from "@/hooks/useScope"

export function NotificationsPage() {
  const { t } = useTranslation()
  const { scopeMerge } = useScope()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ["notifications", page],
    queryFn: () => getNotifications(scopeMerge({ page: String(page), page_size: "20" })),
  })

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  })

  const notifications: Notification[] = data?.items ?? (Array.isArray(data) ? data : [])

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("notifications.title")}</h1>
        <p className="text-gray-500 mt-1">{t("notifications.subtitle")}</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t("notifications.noNotifications")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-4 p-4 rounded-lg border ${
                    n.is_read ? "bg-white border-gray-200" : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.is_read ? "text-gray-700" : "font-semibold text-gray-900"}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {formatDateTime(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markReadMutation.mutate(n.id)}
                      disabled={markReadMutation.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {data?.total_pages > 1 && (
            <div className="flex justify-center mt-6 gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t("common.previous")}
              </Button>
              <span className="px-3 py-1 text-sm">{page} / {data.total_pages}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= data.total_pages}
                onClick={() => setPage(page + 1)}
              >
                {t("common.next")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
