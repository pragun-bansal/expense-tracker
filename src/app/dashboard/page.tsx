'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, CreditCard, Users, TrendingUp, Calendar } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({
    totalExpenses: 0,
    monthlyExpenses: 0,
    totalAccounts: 0,
    activeGroups: 0
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Fetch user stats
    fetchStats()
  }, [session, status, router])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  if (status === 'loading') {
    return <CurrencyLoader />
  }

  if (!session) {
    return null
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center">
        <div className="mb-6 lg:mb-0">
          <h1 className="text-3xl lg:text-4xl font-bold text-heading mb-2">
            Welcome back, {session.user.name}
          </h1>
          <p className="text-body text-lg">
            Here's your financial overview
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <Link
            href="/expenses/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-button-primary bg-button-primary bg-button-primary:hover"
          >
            <PlusCircle className="h-5 w-5 mr-2" />
            Add Expense
          </Link>
          <Link
            href="/groups/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-button-secondary bg-button-secondary bg-button-secondary:hover"
          >
            <Users className="h-5 w-5 mr-2" />
            Create Group
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm font-medium">Total Expenses</p>
              <p className="text-3xl font-bold text-card-header mt-1">
                ${stats.totalExpenses.toFixed(2)}
              </p>
            </div>
            <div className="bg-status-info p-3 rounded-full">
              <TrendingUp className="h-8 w-8 text-icon-info" />
            </div>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm font-medium">This Month</p>
              <p className="text-3xl font-bold text-card-header mt-1">
                ${stats.monthlyExpenses.toFixed(2)}
              </p>
            </div>
            <div className="bg-status-success p-3 rounded-full">
              <Calendar className="h-8 w-8 text-icon-success" />
            </div>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm font-medium">Accounts</p>
              <p className="text-3xl font-bold text-card-header mt-1">
                {stats.totalAccounts}
              </p>
            </div>
            <div className="bg-status-warning p-3 rounded-full">
              <CreditCard className="h-8 w-8 text-icon-warning" />
            </div>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm font-medium">Groups</p>
              <p className="text-3xl font-bold text-card-header mt-1">
                {stats.activeGroups}
              </p>
            </div>
            <div className="bg-status-error p-3 rounded-full">
              <Users className="h-8 w-8 text-icon-error" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/expenses"
          className="bg-card p-6 rounded-lg shadow-card hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-4">
            <div className="bg-status-info p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-icon-info" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-card-header">Recent Expenses</h3>
            </div>
          </div>
          <p className="text-card-body">View and manage your recent transactions</p>
        </Link>
        
        <Link
          href="/accounts"
          className="bg-card p-6 rounded-lg shadow-card hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-4">
            <div className="bg-status-success p-3 rounded-full">
              <CreditCard className="h-6 w-6 text-icon-success" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-card-header">Manage Accounts</h3>
            </div>
          </div>
          <p className="text-card-body">Track balances across all your accounts</p>
        </Link>
        
        <Link
          href="/groups"
          className="bg-card p-6 rounded-lg shadow-card hover:shadow-md transition-shadow"
        >
          <div className="flex items-center mb-4">
            <div className="bg-status-warning p-3 rounded-full">
              <Users className="h-6 w-6 text-icon-warning" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-card-header">Shared Expenses</h3>
            </div>
          </div>
          <p className="text-card-body">Split bills with friends and family</p>
        </Link>
      </div>
    </div>
  )
}