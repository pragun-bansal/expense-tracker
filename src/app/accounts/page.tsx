'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PlusCircle, CreditCard, Trash2 } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useCurrency } from '@/hooks/useCurrency'
import AlertModal from '@/components/AlertModal'
import ConfirmModal from '@/components/ConfirmModal'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useModal } from '@/hooks/useModal'

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
    return <CurrencyLoader />
  }

  return (
    <div>
      <div className="flex sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-heading">Accounts</h1>
          <p className="mt-2 text-sm text-body">
            Total Balance: {formatAmount(totalBalance)}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-button-primary px-4 py-2 text-sm font-medium text-button-primary shadow-sm bg-button-primary:hover focus:outline-none focus:ring-2 ring-focus focus:ring-offset-2 sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Account
          </button>
        </div>
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <div className="bg-card shadow-card rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-card-header mb-4">
              Add New Account
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-input-label mb-3">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                    placeholder="My Bank Account"
                  />
                </div>
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-input-label mb-3">
                    Account Type *
                  </label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200 appearance-none bg-arrow-down bg-no-repeat bg-right bg-origin-content"
                  >
                    <option value="BANK">Bank Account</option>
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="INVESTMENT">Investment</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <label htmlFor="balance" className="block text-sm font-medium text-input-label mb-3">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="balance"
                    value={formData.balance}
                    onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                  />
                </div>
                <div>
                  <label htmlFor="color" className="block text-sm font-medium text-input-label mb-3">
                    Color
                  </label>
                  <input
                    type="color"
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="block w-full h-12 px-4 py-3 border-input rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-input py-3 px-6 border border-input rounded-lg shadow-sm text-sm sm:text-base font-medium text-input-label hover:bg-button-secondary-hover transition-all duration-200 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="bg-blue-600 border border-transparent rounded-lg shadow-sm py-3 px-6 text-sm sm:text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all duration-200"
                >
                  {createLoading ? <LoadingSpinner size="sm" /> : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Special Accounts Section */}
      {specialAccounts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-heading mb-4">System Accounts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {specialAccounts.map((account) => (
              <div key={account.id} className="bg-card overflow-hidden shadow-card rounded-lg border border-status-info">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: account.color + '20' }}
                      >
                        <CreditCard
                          className="h-6 w-6"
                          style={{ color: account.color }}
                        />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-heading">
                          {account.name}
                        </h3>
                        <p className="text-sm text-muted">
                          {account.type === 'OTHERS_FIXED' ? 'Default Account' : 'Group Lending & Borrowing'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${
                        account.balance >= 0 
                          ? 'text-status-success' 
                          : 'text-status-error'
                      }`}>
                        {formatAmount(account.balance)}
                      </p>
                      <p className="text-xs text-muted">
                        {account.type === 'GROUP_LENDING' 
                          ? (account.balance >= 0 ? 'Net Lending' : 'Net Borrowing')
                          : 'Miscellaneous'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Accounts Section */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-heading mb-4">Personal Accounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regularAccounts.map((account) => (
          <div key={account.id} className="bg-card overflow-hidden shadow-card rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: account.color + '20' }}
                  >
                    <CreditCard
                      className="h-6 w-6"
                      style={{ color: account.color }}
                    />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-heading">{account.name}</h3>
                    <p className="text-sm text-muted">{getAccountTypeDisplay(account.type)}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDelete(account.id)}
                    disabled={deleteLoading}
                    className="text-status-error hover:text-red-700 disabled:opacity-50"
                  >
                    {deleteLoading ? <LoadingSpinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-heading">
                  {formatAmount(account.balance)}
                </div>
                <div className="text-sm text-muted">Current Balance</div>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {regularAccounts.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-heading">No accounts</h3>
          <p className="mt-1 text-sm text-muted">Get started by creating your first account.</p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Account
            </button>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <AlertModal
          isOpen={alertModal?.isOpen || false}
          onClose={closeAlert}
          title={alertModal?.title || ''}
          message={alertModal?.message || ''}
          type={alertModal?.type || 'info'}
          confirmText={alertModal.confirmText}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
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
      )}
    </div>
  )
}