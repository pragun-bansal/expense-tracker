'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
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

export default function NewIncome() {
  const { data: session } = useSession()
  const { formatAmount } = useCurrency()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    source: ''
  })
  
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session) {
      fetchCategories()
      fetchAccounts()
    }
  }, [session])

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
        
        // Set default account to "Others" if no accountId is set
        if (!formData.accountId) {
          const othersAccount = data.find((account: Account) => account.type === 'OTHERS_FIXED')
          if (othersAccount) {
            setFormData(prev => ({ ...prev, accountId: othersAccount.id }))
          }
        }
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
      const response = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        router.push('/transactions')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create income')
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

  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-12">
        <div className="mb-8">
          <Link
            href="/transactions"
            className="inline-flex items-center text-sm font-medium text-link text-link:hover"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transactions
          </Link>
        </div>

        <div className="bg-card shadow-card rounded-lg">
          <div className="px-4 py-6 sm:px-8 sm:py-8 lg:p-10">
            <h3 className="text-lg font-medium leading-6 text-card-header mb-6">
              Add New Income
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
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
                    Account (Optional)
                  </label>
                  <select
                    name="accountId"
                    id="accountId"
                    value={formData.accountId}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200 appearance-none bg-arrow-down bg-no-repeat bg-right bg-origin-content"
                  >
                    {accounts
                      .filter(account => account.type === 'OTHERS_FIXED')
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} (Default)
                        </option>
                      ))}
                    <optgroup label="Personal Accounts">
                      {accounts
                        .filter(account => !['OTHERS_FIXED', 'GROUP_LENDING'].includes(account.type))
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name} ({formatAmount(account.balance)})
                          </option>
                        ))}
                    </optgroup>
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
                <div className="text-status-error text-sm bg-status-error/10 p-3 rounded-lg border border-status-error/20">{error}</div>
              )}

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                <Link
                  href="/transactions"
                  className="bg-input py-3 px-6 border border-input rounded-lg shadow-sm text-sm sm:text-base font-medium text-input-label hover:bg-button-secondary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-green-600 border border-transparent rounded-lg shadow-sm py-3 px-6 text-sm sm:text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 transition-all duration-200"
                >
                  {isLoading ? 'Adding...' : 'Add Income'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}