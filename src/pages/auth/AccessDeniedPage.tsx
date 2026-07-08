import { useNavigate } from "react-router-dom"
import { ShieldX } from "lucide-react"
import { Button } from "@/components/ui"
import { useTranslation } from "react-i18next"

export function AccessDeniedPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-100 mb-4">
            <ShieldX className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t("auth.accessDeniedTitle")}
          </h1>
          <p className="text-gray-500 mt-2 mb-6">{t("auth.accessDenied")}</p>
          <Button className="w-full" size="lg" onClick={() => navigate("/login")}>
            {t("auth.backToLogin")}
          </Button>
        </div>
      </div>
    </div>
  )
}
