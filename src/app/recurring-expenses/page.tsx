'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PlusCircle, Calendar, Play, Pause, Edit, Trash2, RefreshCw } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'

interface RecurringExpense {
  id: string
  amount: number
  description: string
  frequency: string
  startDate: string
  endDate?: string
  nextDueDate: string
  isActive: boolean
  category: {
    id: string
    name: string
    color?: string
  }
  account: {
    id: string
    name: string
    type: string
  }
  expenses: Array<{
    id: string
    amount: number
    date: string
  }>
}

interface Category {
  id: string
  name: string
  color?: string
}

interface Account {
  id: string
  name: string
  type: string
  balance: number
}

export default function RecurringExpenses() {
  const { data: session } = useSession()
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    frequency: 'MONTHLY',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    categoryId: '',
    accountId: ''
  })

  useEffect(() => {
    if (session) {
      fetchRecurringExpenses()
      fetchCategories()
      fetchAccounts()
    }
  }, [session])

  const fetchRecurringExpenses = async () => {
    try {
      const response = await fetch('/api/recurring-expenses')
      if (response.ok) {
        const data = await response.json()
        setRecurringExpenses(data)
      }
    } catch (error) {
      console.error('Error fetching recurring expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?type=EXPENSE')
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/recurring-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const newRecurringExpense = await response.json()
        setRecurringExpenses([...recurringExpenses, newRecurringExpense])
        setShowAddForm(false)
        setFormData({
          amount: '',
          description: '',
          frequency: 'MONTHLY',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          categoryId: '',
          accountId: ''
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create recurring expense')
      }
    } catch (error) {
      console.error('Error creating recurring expense:', error)
      alert('Something went wrong')
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/recurring-expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (response.ok) {
        setRecurringExpenses(recurringExpenses.map(expense => 
          expense.id === id ? { ...expense, isActive: !currentStatus } : expense
        ))
      }
    } catch (error) {
      console.error('Error updating recurring expense:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring expense?')) return

    try {
      const response = await fetch(`/api/recurring-expenses/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setRecurringExpenses(recurringExpenses.filter(expense => expense.id !== id))
      }
    } catch (error) {
      console.error('Error deleting recurring expense:', error)
    }
  }

  const handleProcessRecurring = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/recurring-expenses/process', {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        alert(result.message)
        fetchRecurringExpenses()
      }
    } catch (error) {
      console.error('Error processing recurring expenses:', error)
      alert('Failed to process recurring expenses')
    } finally {
      setProcessing(false)
    }
  }

  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case 'DAILY': return 'Daily'
      case 'WEEKLY': return 'Weekly'
      case 'MONTHLY': return 'Monthly'
      case 'YEARLY': return 'Yearly'
      default: return frequency
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isDue = (nextDueDate: string) => {
    return new Date(nextDueDate) <= new Date()
  }

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Recurring Expenses</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Automate your regular expenses
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handleProcessRecurring}
            disabled={processing}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
            {processing ? 'Processing...' : 'Process Due'}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Recurring Expense
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/20 rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Add Recurring Expense
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="amount"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Frequency *
                  </label>
                  <select
                    id="frequency"
                    value={formData.frequency}
                    onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category *
                  </label>
                  <select
                    id="categoryId"
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="accountId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Account *
                  </label>
                  <select
                    id="accountId"
                    required
                    value={formData.accountId}
                    onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select an account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <input
                  type="text"
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Description of the recurring expense"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
                  Add Recurring Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recurring Expenses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recurringExpenses.map((expense) => (
          <div key={expense.id} className="bg-white dark:bg-gray-800 overflow-hidden shadow dark:shadow-gray-900/20 rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: (expense.category?.color || '#6B7280') + '20' }}
                  >
                    <Calendar
                      className="h-6 w-6"
                      style={{ color: expense.category?.color || '#6B7280' }}
                    />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      ${expense.amount.toFixed(2)}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatFrequency(expense.frequency)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleToggleActive(expense.id, expense.isActive)}
                    className={`p-2 rounded-full ${expense.isActive ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    {expense.isActive ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-full"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="text-sm text-gray-900 dark:text-white">
                  {expense.description || 'No description'}
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Category: {expense.category.name}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    Account: {expense.account.name}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    Next Due: {formatDate(expense.nextDueDate)}
                  </span>
                  {isDue(expense.nextDueDate) && expense.isActive && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                      Due
                    </span>
                  )}
                </div>
                {expense.expenses.length > 0 && (
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Last processed: {formatDate(expense.expenses[0].date)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {recurringExpenses.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No recurring expenses</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating your first recurring expense.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Recurring Expense
            </button>
          </div>
        </div>
      )}
    </div>
  )
}