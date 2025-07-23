'use client'

import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import {ThemeToggle} from "@/components/ThemeToggle2";

const publicRoutes = ['/auth/signin', '/auth/signup', '/']

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()

  const isPublicRoute = publicRoutes.includes(pathname)

  if (isPublicRoute || !session) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-page">

      <Sidebar />
      <div className="lg:pl-64">
          <ThemeToggle />
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}