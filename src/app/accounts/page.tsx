'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PlusCircle, CreditCard, Trash2 } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'

interface Account {
  id: string
  name: string
  type: string
  balance: number
  color?: string
}

export default function Accounts() {
  const { data: session } = useSession()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
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
    }
  }

  const handleDelete = async (accountId: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return

    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setAccounts(accounts.filter(account => account.id !== accountId))
      }
    } catch (error) {
      console.error('Error deleting account:', error)
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
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Accounts</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Total Balance: ${totalBalance.toFixed(2)}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Account
          </button>
        </div>
      </div>

      {/* Add Account Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/20 rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Add New Account
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="My Bank Account"
                  />
                </div>
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account Type *
                  </label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="BANK">Bank Account</option>
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                    <option value="INVESTMENT">Investment</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="balance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Initial Balance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="balance"
                    value={formData.balance}
                    onChange={(e) => setFormData({...formData, balance: parseFloat(e.target.value) || 0})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="color" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Color
                  </label>
                  <input
                    type="color"
                    id="color"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                    className="mt-1 block w-full h-10 border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-white dark:bg-gray-700 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Special Accounts Section */}
      {specialAccounts.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">System Accounts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {specialAccounts.map((account) => (
              <div key={account.id} className="bg-white dark:bg-gray-800 overflow-hidden shadow dark:shadow-gray-900/20 rounded-lg border border-blue-200 dark:border-blue-600">
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
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {account.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {account.type === 'OTHERS_FIXED' ? 'Default Account' : 'Group Lending & Borrowing'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${
                        account.balance >= 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        ${account.balance.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Personal Accounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {regularAccounts.map((account) => (
          <div key={account.id} className="bg-white dark:bg-gray-800 overflow-hidden shadow dark:shadow-gray-900/20 rounded-lg">
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
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{account.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{getAccountTypeDisplay(account.type)}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleDelete(account.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${account.balance.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Current Balance</div>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {regularAccounts.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No accounts</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating your first account.</p>
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
    </div>
  )
}