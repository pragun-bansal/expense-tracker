'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { 
  LayoutDashboard, 
  CreditCard, 
  Receipt, 
  Users, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Menu,
  X,
  DollarSign,
  PieChart,
  Target,
  FileText,
  Repeat,
  Calculator,
  Shield,
  Bell,
  Palette
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Notifications', href: '/notifications', icon: Bell },
  { name: 'Transactions', href: '/transactions', icon: TrendingUp },
  { name: 'Recurring', href: '/recurring-expenses', icon: Repeat },
  { name: 'Accounts', href: '/accounts', icon: CreditCard },
  { name: 'Groups', href: '/groups', icon: Users },
  // { name: 'Debt Settlement', href: '/debt-settlement', icon: Calculator },
  { name: 'Analytics', href: '/analytics', icon: PieChart },
  { name: 'Budgets', href: '/budgets', icon: Target },
  { name: 'Budgets & Categories', href: '/budgets-categories', icon: Palette },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Backup', href: '/backup', icon: Shield },
]

export default function Sidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-sidebar-mobile-overlay" onClick={() => setSidebarOpen(false)} />
        
        <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-sidebar shadow-xl">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-sidebar-brand-text">
              Fina
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-2 text-icon-neutral bg-sidebar-nav-hover hover:text-text-muted"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-sidebar-nav-active text-sidebar-nav-active'
                      : 'text-sidebar-nav bg-sidebar-nav-hover text-sidebar-nav-hover'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          
          <div className="border-t border-sidebar p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                    {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-sidebar-user-name">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-sidebar-user-email">
                    {session?.user?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex"><ThemeToggle /></div>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-icon-neutral hover:text-text-muted"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-sidebar border-r border-sidebar overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4 py-4">
            <TrendingUp className="h-8 w-8 text-sidebar-brand-icon" />
            <h1 className="ml-2 text-xl font-bold text-sidebar-brand-text">
              Fina
            </h1>
          </div>
          
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-sidebar-nav-active text-sidebar-nav-active'
                      : 'text-sidebar-nav bg-sidebar-nav-hover text-sidebar-nav-hover'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          
          <div className="border-t border-sidebar p-4">
            <div className="items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                    {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-sidebar-user-name">
                    {session?.user?.name}
                  </p>
                  <p className="text-xs text-sidebar-user-email">
                    {session?.user?.email}
                  </p>
                </div>
              </div>
              <div className="flex justify-between space-x-2">
                <ThemeToggle />
                <button
                  onClick={handleSignOut}
                  className="p-2 text-icon-neutral hover:text-text-muted"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between bg-sidebar border-b border-sidebar px-4 py-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-icon-neutral bg-sidebar-nav-hover hover:text-text-muted"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold text-sidebar-brand-text">
            Fina
          </h1>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="p-2 text-muted hover:text-body"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}