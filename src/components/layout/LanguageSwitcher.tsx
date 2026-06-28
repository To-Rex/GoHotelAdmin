import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui"

const languages = [
  { code: "uz", label: "O'zbek" },
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  return (
    <div className="flex items-center gap-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`px-2 py-1 text-xs rounded-md transition-colors ${
            i18n.language === lang.code || (lang.code === "uz" && !i18n.language)
              ? "bg-primary-600 text-white"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}
