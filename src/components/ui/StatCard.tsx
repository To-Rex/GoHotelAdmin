import { cn } from "@/lib/utils"

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  className,
}: {
  title: string
  value: string | number
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-gray-200 bg-white p-6 shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {Icon && <Icon className="h-5 w-5 text-gray-400" />}
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  )
}
