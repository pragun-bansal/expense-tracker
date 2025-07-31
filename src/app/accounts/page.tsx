'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { PlusCircle, CreditCard, Trash2 } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useCurrency } from '@/hooks/useCurrency'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useModal } from '@/hooks/useModal'
import { AccountListSkeleton } from '@/components/SkeletonLoaders'

// Lazy load modal components
const AlertModal = lazy(() => import('@/components/AlertModal'))
const ConfirmModal = lazy(() => import('@/components/ConfirmModal'))

interface Account {
  id: string
  name: string
  type: string
  balance: number
  color?: string
}

export default function Accounts() {
  const { data: session } = useSession()
  const { formatAmount } = useCurrency()
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'BANK',
    balance: 0,
    color: '#3B82F6'
  })

  useEffect(() => {
    if (session) {
      fetchAccounts()
    }
  }, [session])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter accounts to separate special accounts from regular accounts
  const regularAccounts = accounts.filter(account => 
    !['OTHERS_FIXED', 'GROUP_LENDING', 'OTHER'].includes(account.type)
  )
  
  const specialAccounts = accounts.filter(account => 
    ['OTHERS_FIXED', 'GROUP_LENDING'].includes(account.type)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const newAccount = await response.json()
        setAccounts([...accounts, newAccount])
        setShowAddForm(false)
        setFormData({ name: '', type: 'BANK', balance: 0, color: '#3B82F6' })
      }
    } catch (error) {
      console.error('Error creating account:', error)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDelete = async (accountId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Account',
      message: 'Are you sure you want to delete this account? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    })

    if (!confirmed) {
      closeConfirm()
      return
    }

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setAccounts(accounts.filter(account => account.id !== accountId))
        showAlert({
          title: 'Success',
          message: 'Account deleted successfully.',
          type: 'success'
        })
      } else {
        showAlert({
          title: 'Error',
          message: 'Failed to delete account. Please try again.',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      showAlert({
        title: 'Error',
        message: 'An error occurred while deleting the account.',
        type: 'error'
      })
    } finally {
      setDeleteLoading(false)
      closeConfirm()
    }
  }

  const getAccountTypeDisplay = (type: string) => {
    switch (type) {
      case 'CASH': return 'Cash'
      case 'BANK': return 'Bank Account'
      case 'CREDIT_CARD': return 'Credit Card'
      case 'INVESTMENT': return 'Investment'
      default: return 'Other'
    }
  }

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  if (loading) {
    return (
      <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="h-6 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <AccountListSkeleton />
      </div>
    )
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-heading">Accounts</h1>
          <p className="text-sm text-body">
            Total: {formatAmount(totalBalance)}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Account
        </button>
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <div className="bg-card rounded-lg border p-4 mb-6">
          <h3 className="text-base font-medium text-card-header mb-4">
            Add New Account
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-input-label mb-2">
                  Account Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="My Bank Account"
                />
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-input-label mb-2">
                  Type *
                </label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="BANK">Bank Account</option>
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="INVESTMENT">Investment</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="balance" className="block text-sm font-medium text-input-label mb-2">
                  Initial Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  id="balance"
                  value={formData.balance}
                  onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="color" className="block text-sm font-medium text-input-label mb-2">
                  Color
                </label>
                <input
                  type="color"
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  className="block w-full h-9 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {createLoading ? <LoadingSpinner size="sm" /> : 'Add Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Special Accounts Section */}
      {specialAccounts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-medium text-heading mb-3">System Accounts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {specialAccounts.map((account) => (
              <div key={account.id} className="bg-card rounded-lg border border-blue-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: account.color + '20' }}
                    >
                      <CreditCard
                        className="h-4 w-4"
                        style={{ color: account.color }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-heading truncate">
                        {account.name}
                      </h3>
                      <p className="text-xs text-muted">
                        {account.type === 'OTHERS_FIXED' ? 'Default' : 'Group Lending'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${
                      account.balance >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatAmount(account.balance)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Accounts Section */}
      <div className="mb-6">
        <h3 className="text-base font-medium text-heading mb-3">Personal Accounts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {regularAccounts.map((account) => (
          <div key={account.id} className="bg-card rounded-lg border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: account.color + '20' }}
                >
                  <CreditCard
                    className="h-4 w-4"
                    style={{ color: account.color }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-heading truncate">{account.name}</h3>
                  <p className="text-xs text-muted">{getAccountTypeDisplay(account.type)}</p>
                  <div className="mt-2">
                    <div className="text-base font-semibold text-heading">
                      {formatAmount(account.balance)}
                    </div>
                  </div>
                </div>
              </div>
              {/*<button*/}
              {/*  onClick={() => handleDelete(account.id)}*/}
              {/*  disabled={deleteLoading}*/}
              {/*  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 flex-shrink-0"*/}
              {/*>*/}
              {/*  {deleteLoading ? <LoadingSpinner size="sm" /> : <Trash2 className="h-4 w-4" />}*/}
              {/*</button>*/}
            </div>
          </div>
        ))}
        </div>
      </div>

      {regularAccounts.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <CreditCard className="mx-auto h-10 w-10 text-gray-300" />
          <h3 className="mt-3 text-base font-medium text-heading">No accounts</h3>
          <p className="mt-1 text-sm text-muted">Create your first account to get started.</p>
          <div className="mt-4">
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Account
            </button>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <Suspense fallback={<div />}>
          <AlertModal
            isOpen={alertModal?.isOpen || false}
            onClose={closeAlert}
            title={alertModal?.title || ''}
            message={alertModal?.message || ''}
            type={alertModal?.type || 'info'}
            confirmText={alertModal.confirmText}
          />
        </Suspense>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <Suspense fallback={<div />}>
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            onClose={closeConfirm}
            onConfirm={confirmModal.onConfirm}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText={confirmModal.confirmText}
            cancelText={confirmModal.cancelText}
            type={confirmModal.type}
            loading={confirmModal.loading}
          />
        </Suspense>
      )}
    </div>
  )
}