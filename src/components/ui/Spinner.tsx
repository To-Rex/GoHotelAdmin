import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-primary-600", className)} />
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

export function FullPageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white/80">
      <Spinner className="h-10 w-10" />
    </div>
  )
}
