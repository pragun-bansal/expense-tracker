'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PlusCircle, Target, AlertTriangle, CheckCircle } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'

interface Budget {
  id: string
  amount: number
  period: string
  startDate: string
  endDate: string
  category?: {
    id: string
    name: string
    color?: string
  }
  currentSpending?: number
  remainingAmount?: number
  percentUsed?: number
}

interface Category {
  id: string
  name: string
  color?: string
}

export default function Budgets() {
  const { data: session } = useSession()
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    amount: '',
    period: 'MONTHLY',
    categoryId: ''
  })

  useEffect(() => {
    if (session) {
      fetchBudgets()
      fetchCategories()
    }
  }, [session])

  const fetchBudgets = async () => {
    try {
      const response = await fetch('/api/budgets')
      if (response.ok) {
        const data = await response.json()
        setBudgets(data)
      }
    } catch (error) {
      console.error('Error fetching budgets:', error)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const newBudget = await response.json()
        setBudgets([...budgets, newBudget])
        setShowAddForm(false)
        setFormData({ amount: '', period: 'MONTHLY', categoryId: '' })
        fetchBudgets() // Refresh to get updated spending data
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create budget')
      }
    } catch (error) {
      console.error('Error creating budget:', error)
      alert('Something went wrong')
    }
  }

  const getBudgetStatus = (budget: Budget) => {
    const percentUsed = budget.percentUsed ?? 0
    if (percentUsed >= 100) {
      return { status: 'exceeded', color: 'bg-red-500', textColor: 'text-red-600', icon: AlertTriangle }
    } else if (percentUsed >= 80) {
      return { status: 'warning', color: 'bg-yellow-500', textColor: 'text-yellow-600', icon: AlertTriangle }
    } else {
      return { status: 'good', color: 'bg-green-500', textColor: 'text-green-600', icon: CheckCircle }
    }
  }

  const formatPeriod = (period: string) => {
    switch (period) {
      case 'WEEKLY': return 'Weekly'
      case 'MONTHLY': return 'Monthly'
      case 'YEARLY': return 'Yearly'
      default: return period
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString()
    const end = new Date(endDate).toLocaleDateString()
    return `${start} - ${end}`
  }

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Budgets</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Set spending limits and track your progress
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Budget
          </button>
        </div>
      </div>

      {/* Add Budget Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/20 rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
              Add New Budget
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Budget Amount *
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
                  <label htmlFor="period" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Period *
                  </label>
                  <select
                    id="period"
                    value={formData.period}
                    onChange={(e) => setFormData({...formData, period: e.target.value})}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
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
                  Add Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {budgets.map((budget) => {
          const status = getBudgetStatus(budget)
          const StatusIcon = status.icon
          
          return (
            <div key={budget.id} className="bg-white dark:bg-gray-800 overflow-hidden shadow dark:shadow-gray-900/20 rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: (budget.category?.color || '#6B7280') + '20' }}
                    >
                      <Target
                        className="h-6 w-6"
                        style={{ color: budget.category?.color || '#6B7280' }}
                      />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {budget.category?.name || 'Unknown Category'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatPeriod(budget.period)}
                      </p>
                    </div>
                  </div>
                  <StatusIcon className={`h-5 w-5 ${status.textColor}`} />
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      ${(budget.currentSpending ?? 0).toFixed(2)} of ${(budget.amount ?? 0).toFixed(2)}
                    </span>
                    <span className={`text-sm font-medium ${status.textColor}`}>
                      {(budget.percentUsed ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${status.color}`}
                      style={{ width: `${Math.min(budget.percentUsed ?? 0, 100)}%` }}
                    />
                  </div>
                  
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Remaining: ${(budget.remainingAmount ?? 0).toFixed(2)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {budget.startDate && budget.endDate ? formatDateRange(budget.startDate, budget.endDate) : 'No dates set'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {budgets.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No budgets</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating your first budget to track spending limits.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Budget
            </button>
          </div>
        </div>
      )}
    </div>
  )
}