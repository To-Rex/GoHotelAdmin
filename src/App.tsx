import { useEffect } from "react"
import { RouterProvider } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { router } from "@/router"
import { useAuthStore } from "@/store/auth"
import { FullPageLoader } from "@/components/ui"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function AppInit({ children }: { children: React.ReactNode }) {
  const { initialize, isInitialized } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!isInitialized) return <FullPageLoader />
  return <>{children}</>
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInit>
        <RouterProvider router={router} />
      </AppInit>
    </QueryClientProvider>
  )
}
