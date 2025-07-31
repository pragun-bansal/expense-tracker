'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
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

interface Income {
  id: string
  amount: number
  description: string
  date: string
  source?: string
  category: Category
  account: Account
}

export default function EditIncome({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const { formatAmount } = useCurrency()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    accountId: '',
    date: '',
    source: ''
  })
  
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) {
      fetchIncome()
      fetchCategories()
      fetchAccounts()
    }
  }, [session])

  const fetchIncome = async () => {
    try {
      const response = await fetch(`/api/income/${params.id}`)
      if (response.ok) {
        const income: Income = await response.json()
        setFormData({
          amount: income.amount.toString(),
          description: income.description || '',
          categoryId: income.category.id,
          accountId: income.account.id,
          date: income.date.split('T')[0],
          source: income.source || ''
        })
      } else {
        setError('Income not found')
      }
    } catch (error) {
      console.error('Error fetching income:', error)
      setError('Error loading income')
    } finally {
      setIsLoadingData(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories?type=INCOME')
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
      const response = await fetch(`/api/income/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        router.push('/transactions')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update income')
      }
    } catch (error) {
      setError('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
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
    <div className="px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-12">
      <div className="mb-8">
        <Link
          href="/transactions"
          className="inline-flex items-center text-sm font-medium text-muted hover:text-body transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Transactions
        </Link>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="bg-card shadow-card rounded-lg">
          <div className="px-8 py-8 sm:p-10">
            <h3 className="text-xl sm:text-2xl font-semibold leading-6 text-heading mb-8">
              Edit Income
            </h3>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-input-label mb-3">
                  Amount *
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="amount"
                  id="amount"
                  required
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-input-label mb-3">
                  Description
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200 resize-none"
                  placeholder="What did you earn from?"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <label htmlFor="categoryId" className="block text-sm font-medium text-input-label mb-3">
                    Category *
                  </label>
                  <select
                    name="categoryId"
                    id="categoryId"
                    required
                    value={formData.categoryId}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200 appearance-none bg-arrow-down bg-no-repeat bg-right bg-origin-content"
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
                  <label htmlFor="accountId" className="block text-sm font-medium text-input-label mb-3">
                    Account *
                  </label>
                  <select
                    name="accountId"
                    id="accountId"
                    required
                    value={formData.accountId}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200 appearance-none bg-arrow-down bg-no-repeat bg-right bg-origin-content"
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-input-label mb-3">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    id="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200"
                  />
                </div>

                <div>
                  <label htmlFor="source" className="block text-sm font-medium text-input-label mb-3">
                    Source
                  </label>
                  <input
                    type="text"
                    name="source"
                    id="source"
                    value={formData.source}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                    placeholder="e.g., Company Name, Client, etc."
                  />
                </div>
              </div>

              {error && (
                <div className="bg-status-error border border-status-error rounded-lg p-4">
                  <p className="text-sm text-status-error font-medium">{error}</p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-input">
                <Link
                  href="/transactions"
                  className="bg-input py-3 px-6 border border-input rounded-lg shadow-sm text-sm sm:text-base font-medium text-input-label hover:bg-button-secondary-hover transition-all duration-200 text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-green-600 border border-transparent rounded-lg shadow-sm py-3 px-6 text-sm sm:text-base font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-all duration-200 min-w-[140px]"
                >
                  {isLoading ? 'Updating...' : 'Update Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}