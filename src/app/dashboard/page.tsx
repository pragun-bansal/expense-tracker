'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  PlusCircle, 
  CreditCard, 
  Users, 
  TrendingUp, 
  Calendar, 
  Plus, 
  X, 
  ArrowUpRight,
  Wallet,
  DollarSign,
  Activity,
  Target
} from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useCurrency } from '@/hooks/useCurrency'
import AlertModal from '@/components/AlertModal'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useModal } from '@/hooks/useModal'

interface DashboardStats {
  totalExpenses: number
  monthlyExpenses: number
  totalIncome: number
  monthlyIncome: number
  netWorth: number
  totalAccounts: number
  activeGroups: number
  transactionCount: number
  recentExpenses: Array<{
    id: string
    description: string
    amount: number
    date: string
    category: { name: string }
  }>
  recentIncome: Array<{
    id: string
    description: string
    amount: number
    date: string
    category: { name: string }
  }>
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  color?: string
  delay?: number
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  color = 'text-primary',
  delay = 0 
}: StatCardProps) => (
  <div 
    className={`bg-card p-4 sm:p-6 rounded-xl shadow-card hover:shadow-lg transition-all duration-500 border border-card-border group hover:-translate-y-1 animate-fade-in`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className={`p-1.5 sm:p-2 rounded-lg ${color.includes('success') ? 'bg-green-100' : color.includes('error') ? 'bg-red-100' : color.includes('warning') ? 'bg-yellow-100' : 'bg-blue-100'} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
          </div>
          <h3 className="text-xs sm:text-sm font-medium text-muted truncate">{title}</h3>
        </div>
        <p className="text-lg sm:text-2xl font-bold text-heading mb-1 sm:mb-2 group-hover:scale-105 transition-transform duration-300">
          {typeof value === 'number' ? value : value}
        </p>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-xs sm:text-sm ${
            trend === 'up' ? 'text-status-success' : 
            trend === 'down' ? 'text-status-error' : 
            'text-muted'
          }`}>
            {trend === 'up' ? (
              <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
            ) : trend === 'down' ? (
              <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 rotate-90" />
            ) : null}
            <span className="truncate">{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  </div>
)

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { formatAmount } = useCurrency()
  const { alertModal, showAlert, closeAlert } = useModal()
  const [stats, setStats] = useState<DashboardStats>({
    totalExpenses: 0,
    monthlyExpenses: 0,
    totalIncome: 0,
    monthlyIncome: 0,
    netWorth: 0,
    totalAccounts: 0,
    activeGroups: 0,
    transactionCount: 0,
    recentExpenses: [],
    recentIncome: []
  })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    memberEmails: ['']
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }

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

  const updateMemberEmail = (index: number, value: string) => {
    const newEmails = [...newGroup.memberEmails]
    newEmails[index] = value
    setNewGroup(prev => ({ ...prev, memberEmails: newEmails }))
  }

  const addMemberEmail = () => {
    setNewGroup(prev => ({
      ...prev,
      memberEmails: [...prev.memberEmails, '']
    }))
  }

  const removeMemberEmail = (index: number) => {
    if (newGroup.memberEmails.length > 1) {
      const newEmails = newGroup.memberEmails.filter((_, i) => i !== index)
      setNewGroup(prev => ({ ...prev, memberEmails: newEmails }))
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newGroup,
          memberEmails: newGroup.memberEmails.filter(email => email.trim())
        })
      })
      if (response.ok) {
        setShowCreateModal(false)
        setNewGroup({ name: '', description: '', memberEmails: [''] })
        await fetchStats()
        showAlert({
          title: 'Success',
          message: 'Group created successfully!',
          type: 'success'
        })
      } else {
        const error = await response.json()
        showAlert({
          title: 'Error',
          message: error.error || 'Failed to create group',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error creating group:', error)
      showAlert({
        title: 'Error',
        message: 'Something went wrong while creating the group.',
        type: 'error'
      })
    } finally {
      setCreateLoading(false)
    }
  }

  if (status === 'loading') {
    return <CurrencyLoader />
  }

  if (!session) {
    return null
  }

  const netIncome = stats.monthlyIncome - stats.monthlyExpenses

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-heading bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Welcome back, {session.user.name}
            </h1>
            <p className="text-muted mt-1 sm:mt-2 text-xs sm:text-sm md:text-base">
              Here's your financial overview
            </p>
          </div>
          <div className="flex flex-row gap-3">
            <Link
              href="/expenses/new"
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <PlusCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Add Expense
            </Link>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-input text-xs sm:text-sm font-medium rounded-lg text-input hover:bg-input-hover transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Create Group
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          title="Monthly Income"
          value={formatAmount(stats.monthlyIncome)}
          icon={TrendingUp}
          color="text-status-success"
          delay={0}
        />
        <StatCard
          title="Monthly Expenses"
          value={formatAmount(stats.monthlyExpenses)}
          icon={TrendingUp}
          color="text-status-error"
          delay={100}
        />
        <StatCard
          title="Net Income"
          value={formatAmount(netIncome)}
          icon={DollarSign}
          color={netIncome >= 0 ? 'text-status-success' : 'text-status-error'}
          delay={200}
        />
        <StatCard
          title="Net Worth"
          value={formatAmount(stats.netWorth)}
          icon={Wallet}
          color="text-purple-600"
          delay={300}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <StatCard
          title="Total Expenses"
          value={formatAmount(stats.totalExpenses)}
          icon={Activity}
          color="text-orange-600"
          delay={400}
        />
        <StatCard
          title="Transactions"
          value={stats.transactionCount}
          icon={Calendar}
          color="text-blue-600"
          delay={500}
        />
        <StatCard
          title="Accounts"
          value={stats.totalAccounts}
          icon={CreditCard}
          color="text-indigo-600"
          delay={600}
        />
        <StatCard
          title="Active Groups"
          value={stats.activeGroups}
          icon={Users}
          color="text-green-600"
          delay={700}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Expenses */}
        <div className="bg-card p-4 sm:p-6 rounded-xl shadow-card border border-card-border animate-fade-in" style={{ animationDelay: '800ms' }}>
          <h3 className="text-base sm:text-lg font-semibold text-heading mb-3 sm:mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-status-error" />
            Recent Expenses
          </h3>
          <div className="space-y-2 sm:space-y-3">
            {stats.recentExpenses?.slice(0, 5).map((expense, index) => (
              <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-background rounded-lg hover:bg-gray-50 transition-colors duration-200">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-xs sm:text-sm font-medium text-heading truncate">{expense.description}</p>
                  <p className="text-xs text-muted truncate">{expense.category.name} • {new Date(expense.date).toLocaleDateString()}</p>
                </div>
                <div className="text-xs sm:text-sm font-semibold text-status-error shrink-0">
                  {formatAmount(expense.amount)}
                </div>
              </div>
            )) || (
              <p className="text-xs sm:text-sm text-muted text-center py-4">No recent expenses</p>
            )}
          </div>
          <div className="mt-4">
            <Link 
              href="/expenses" 
              className="text-primary text-xs sm:text-sm font-medium hover:text-primary-hover transition-colors duration-200"
            >
              View all expenses →
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card p-4 sm:p-6 rounded-xl shadow-card border border-card-border animate-fade-in" style={{ animationDelay: '900ms' }}>
          <h3 className="text-base sm:text-lg font-semibold text-heading mb-3 sm:mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Quick Actions
          </h3>
          <div className="space-y-2 sm:space-y-3">
            <Link
              href="/income/new"
              className="flex items-center p-2 sm:p-3 bg-background rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
            >
              <div className="p-2 bg-green-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs sm:text-sm font-medium text-heading">Add Income</p>
                <p className="text-xs text-muted">Record new income</p>
              </div>
            </Link>
            
            <Link
              href="/accounts"
              className="flex items-center p-2 sm:p-3 bg-background rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
            >
              <div className="p-2 bg-blue-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs sm:text-sm font-medium text-heading">Manage Accounts</p>
                <p className="text-xs text-muted">Track balances</p>
              </div>
            </Link>
            
            <Link
              href="/analytics"
              className="flex items-center p-2 sm:p-3 bg-background rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
            >
              <div className="p-2 bg-purple-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Activity className="h-4 w-4 text-purple-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs sm:text-sm font-medium text-heading">View Analytics</p>
                <p className="text-xs text-muted">Financial insights</p>
              </div>
            </Link>

            <Link
              href="/budgets-categories"
              className="flex items-center p-2 sm:p-3 bg-background rounded-lg hover:bg-gray-50 transition-colors duration-200 group"
            >
              <div className="p-2 bg-orange-100 rounded-lg group-hover:scale-110 transition-transform duration-300">
                <Target className="h-4 w-4 text-orange-600" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-xs sm:text-sm font-medium text-heading">Set Budgets</p>
                <p className="text-xs text-muted">Control spending</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-modal-overlay overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-4 sm:p-5 border w-full max-w-lg shadow-lg rounded-xl bg-card">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-semibold text-heading">
                Create New Group
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-button-secondary-hover rounded-lg transition-colors duration-200"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5 text-muted" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-input-label mb-2 sm:mb-3">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={newGroup.name}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  className="block w-full px-3 sm:px-4 py-2 sm:py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-sm sm:text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                  placeholder="e.g., Roommates, Vacation Trip"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-input-label mb-2 sm:mb-3">
                  Description
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                  className="block w-full px-3 sm:px-4 py-2 sm:py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-sm sm:text-base bg-input text-input placeholder-gray-400 transition-all duration-200 resize-none"
                  rows={3}
                  placeholder="Optional description for the group"
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-input-label mb-2 sm:mb-3">
                  Member Emails
                </label>
                <div className="space-y-2 sm:space-y-3">
                  {newGroup.memberEmails.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateMemberEmail(index, e.target.value)}
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-sm sm:text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                        placeholder="Enter email address"
                      />
                      {newGroup.memberEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMemberEmail(index)}
                          className="p-2 sm:p-3 text-status-error hover:bg-red-50 rounded-lg transition-colors duration-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addMemberEmail}
                  className="mt-2 sm:mt-3 flex items-center text-xs sm:text-sm text-primary hover:text-primary-hover transition-colors duration-200"
                >
                  <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Add another member
                </button>
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 sm:pt-6 border-t border-input">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-input-label hover:bg-input-hover border border-input rounded-lg transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !newGroup.name.trim()}
                  className="bg-blue-600 border border-transparent rounded-lg shadow-sm px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 min-w-[100px] sm:min-w-[120px]"
                >
                  {createLoading ? <LoadingSpinner size="sm" /> : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={closeAlert}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  )
}