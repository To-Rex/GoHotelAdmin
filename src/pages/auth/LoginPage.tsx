import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Building2 } from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { Button, Input } from "@/components/ui"
import { useTranslation } from "react-i18next"

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loginSchema = z.object({
    username: z.string().min(1, t("auth.usernameRequired")),
    password: z.string().min(1, t("auth.passwordRequired")),
  })

  type LoginForm = z.infer<typeof loginSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError("")
    setIsSubmitting(true)
    try {
      await login(data.username, data.password)
      navigate("/")
    } catch {
      setError(t("auth.invalidCredentials"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-600 mb-4">
            <Building2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t("app.title")}</h1>
          <p className="text-gray-500 mt-1">{t("app.subtitle")}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              id="username"
              label={t("auth.username")}
              placeholder={t("auth.username")}
              error={errors.username?.message}
              {...register("username")}
            />

            <Input
              id="password"
              label={t("auth.password")}
              type="password"
              placeholder={t("auth.password")}
              error={errors.password?.message}
              {...register("password")}
            />

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isSubmitting}
            >
              {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
