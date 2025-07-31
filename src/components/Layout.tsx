'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import {ThemeToggle} from "@/components/ThemeToggle2";
import ServiceWorkerUpdater from './ServiceWorkerUpdater'

const publicRoutes = ['/auth/signin', '/auth/signup', '/']

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  const isPublicRoute = publicRoutes.includes(pathname)

  // Show children without layout for public routes or while loading
  if (isPublicRoute) {
    return <>{children}</>
  }

  // For protected routes, wait for session to load
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // If not authenticated, let the page handle redirect
  if (!session) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-page">
      <ServiceWorkerUpdater />
      <Sidebar />
      <div className="lg:pl-64">
          {/*<ThemeToggle />*/}
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}