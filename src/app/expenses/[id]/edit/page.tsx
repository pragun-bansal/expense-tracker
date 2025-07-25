'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts'
import { useCurrency } from '@/hooks/useCurrency'

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

interface Account {
  id: string
  name: string
  type: string
  balance: number
}

interface Expense {
  id: string
  amount: number
  description: string
  date: string
  receiptUrl?: string
  isRecurring: boolean
  category: Category
  account: Account
}

export default function EditExpense({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const { handleBudgetAlert } = useBudgetAlerts()
  const { formatAmount } = useCurrency()
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    accountId: '',
    date: '',
    receiptUrl: '',
    isRecurring: false
  })
  
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) {
      fetchExpense()
      fetchCategories()
      fetchAccounts()
    }
  }, [session])

  const fetchExpense = async () => {
    try {
      const response = await fetch(`/api/expenses/${params.id}`)
      if (response.ok) {
        const expense: Expense = await response.json()
        setFormData({
          amount: expense.amount.toString(),
          description: expense.description || '',
          categoryId: expense.category.id,
          accountId: expense.account.id,
          date: expense.date.split('T')[0],
          receiptUrl: expense.receiptUrl || '',
          isRecurring: expense.isRecurring
        })
      } else {
        setError('Expense not found')
      }
    } catch (error) {
      console.error('Error fetching expense:', error)
      setError('Error loading expense')
    } finally {
      setIsLoadingData(false)
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
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/expenses/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        
        // Handle budget alerts if present
        if (data.budgetAlert) {
          handleBudgetAlert(data.budgetAlert)
        }
        
        router.push('/expenses')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update expense')
      }
    } catch (error) {
      setError('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  if (isLoadingData) {
    return <CurrencyLoader />
  }

  if (error && isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/expenses"
          className="inline-flex items-center text-sm font-medium text-muted hover:text-body"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Expenses
        </Link>
      </div>

      <div className="max-w-2xl">
        <div className="bg-card shadow-card rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-heading mb-6">
              Edit Expense
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-input-label">
                  Amount *
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    id="amount"
                    required
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="block w-full border-input rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-input text-heading"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-input-label">
                  Description
                </label>
                <div className="mt-1">
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="block w-full border-input rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-input text-heading"
                    placeholder="What did you spend on?"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="categoryId" className="block text-sm font-medium text-input-label">
                    Category *
                  </label>
                  <div className="mt-1">
                    <select
                      name="categoryId"
                      id="categoryId"
                      required
                      value={formData.categoryId}
                      onChange={handleInputChange}
                      className="block w-full border-input rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-input text-heading"
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

                <div>
                  <label htmlFor="accountId" className="block text-sm font-medium text-input-label">
                    Account *
                  </label>
                  <div className="mt-1">
                    <select
                      name="accountId"
                      id="accountId"
                      required
                      value={formData.accountId}
                      onChange={handleInputChange}
                      className="block w-full border-input rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-input text-heading"
                    >
                      <option value="">Select an account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({formatAmount(account.balance)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-medium text-input-label">
                  Date
                </label>
                <div className="mt-1">
                  <input
                    type="date"
                    name="date"
                    id="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="block w-full border-input rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-input text-heading"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="receiptUrl" className="block text-sm font-medium text-input-label">
                  Receipt (URL)
                </label>
                <div className="mt-1">
                  <input
                    type="url"
                    name="receiptUrl"
                    id="receiptUrl"
                    value={formData.receiptUrl}
                    onChange={handleInputChange}
                    className="block w-full border-input rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-input text-heading"
                    placeholder="https://example.com/receipt.jpg"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isRecurring"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isRecurring" className="ml-2 block text-sm text-heading">
                  This is a recurring expense
                </label>
              </div>

              {error && (
                <div className="text-status-error text-sm">{error}</div>
              )}

              <div className="flex justify-end space-x-3">
                <Link
                  href="/expenses"
                  className="bg-input py-2 px-4 border border-input rounded-md shadow-sm text-sm font-medium text-input-label hover:bg-button-secondary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? 'Updating...' : 'Update Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}