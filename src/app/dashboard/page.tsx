'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, CreditCard, Users, TrendingUp, Calendar, Plus, X } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useCurrency } from '@/hooks/useCurrency'
import AlertModal from '@/components/AlertModal'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useModal } from '@/hooks/useModal'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { formatAmount } = useCurrency()
  const { alertModal, showAlert, closeAlert } = useModal()
  const [stats, setStats] = useState({
    totalExpenses: 0,
    monthlyExpenses: 0,
    totalAccounts: 0,
    activeGroups: 0
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
        await fetchStats() // Refresh stats to update group count
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

  return (
    <div className="space-y-8 sm:space-y-10 p-4 sm:p-6 lg:p-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start">
        <div className="mb-6 sm:mb-8 lg:mb-0">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-heading mb-2 sm:mb-3">
            Welcome back, {session.user.name}
          </h1>
          <p className="text-body text-base sm:text-lg">
            Here's your financial overview
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 lg:space-x-5 w-full sm:w-auto">
          <Link
            href="/expenses/new"
            className="inline-flex items-center justify-center px-4 sm:px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg text-button-primary bg-button-primary bg-button-primary:hover transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <PlusCircle className="h-4 sm:h-5 w-4 sm:w-5 mr-2" />
            Add Expense
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center px-4 sm:px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg text-button-secondary bg-button-secondary bg-button-secondary:hover transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <Users className="h-4 sm:h-5 w-4 sm:w-5 mr-2" />
            Create Group
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        <div className="bg-card p-6 sm:p-8 rounded-xl shadow-card hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm font-medium">Total Expenses</p>
              <p className="text-3xl font-bold text-card-header mt-1">
                {formatAmount(stats.totalExpenses)}
              </p>
            </div>
            <div className="bg-status-info p-3 rounded-full">
              <TrendingUp className="h-8 w-8 text-icon-info" />
            </div>
          </div>
        </div>
        
        <div className="bg-card p-6 sm:p-8 rounded-xl shadow-card hover:shadow-lg transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted text-sm font-medium">This Month</p>
              <p className="text-3xl font-bold text-card-header mt-1">
                {formatAmount(stats.monthlyExpenses)}
              </p>
            </div>
            <div className="bg-status-success p-3 rounded-full">
              <Calendar className="h-8 w-8 text-icon-success" />
            </div>
          </div>
        </div>
        
        <div className="bg-card p-6 sm:p-8 rounded-xl shadow-card hover:shadow-lg transition-all duration-200">
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

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-modal-overlay overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-heading">
                Create New Group
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-button-secondary-hover rounded-lg transition-colors duration-200"
              >
                <X className="h-5 w-5 text-muted" />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="space-y-6 sm:space-y-8">
              <div>
                <label className="block text-sm font-medium text-input-label mb-3">
                  Group Name *
                </label>
                <input
                  type="text"
                  required
                  value={newGroup.name}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                  placeholder="e.g., Roommates, Vacation Trip"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-input-label mb-3">
                  Description
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                  className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200 resize-none"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-input-label mb-3">
                  Member Emails
                </label>
                <div className="space-y-3">
                  {newGroup.memberEmails.map((email, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => updateMemberEmail(index, e.target.value)}
                        className="flex-1 px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                        placeholder="member@example.com"
                      />
                      {newGroup.memberEmails.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMemberEmail(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addMemberEmail}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Member
                  </button>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="bg-input py-3 px-6 border border-input rounded-lg shadow-sm text-sm sm:text-base font-medium text-input-label hover:bg-button-secondary-hover transition-all duration-200 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || !newGroup.name.trim()}
                  className="bg-blue-600 border border-transparent rounded-lg shadow-sm py-3 px-6 text-sm sm:text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 min-w-[140px] flex items-center justify-center"
                >
                  {createLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    'Create Group'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <AlertModal
          isOpen={alertModal.isOpen}
          onClose={closeAlert}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
          confirmText={alertModal.confirmText}
        />
      )}
    </div>
  )
}