'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { PlusCircle, Filter, Search, Edit, Trash2 } from 'lucide-react'

interface Income {
  id: string
  amount: number
  description: string
  date: string
  source?: string
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
}

export default function Income() {
  const { data: session } = useSession()
  const [incomes, setIncomes] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    if (session) {
      fetchIncomes()
      fetchCategories()
      fetchAccounts()
    }
  }, [session])

  const fetchIncomes = async () => {
    try {
      const params = new URLSearchParams({
        ...(filterCategory && { category: filterCategory }),
        ...(filterAccount && { account: filterAccount })
      })
      
      const response = await fetch(`/api/income?${params}`)
      if (response.ok) {
        const data = await response.json()
        setIncomes(data.incomes)
      }
    } catch (error) {
      console.error('Error fetching incomes:', error)
    } finally {
      setLoading(false)
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

  const handleDeleteIncome = async (incomeId: string) => {
    if (!confirm('Are you sure you want to delete this income?')) return

    try {
      const response = await fetch(`/api/income/${incomeId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setIncomes(incomes.filter(income => income.id !== incomeId))
      }
    } catch (error) {
      console.error('Error deleting income:', error)
    }
  }

  const filteredIncomes = incomes.filter(income =>
    income.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    income.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (income.source && income.source.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const totalAmount = filteredIncomes.reduce((sum, income) => sum + income.amount, 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading income...</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Income</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Total: ${totalAmount.toFixed(2)} ({filteredIncomes.length} entries)
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            href="/income/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Income
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/20 rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Search
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm text-gray-900 dark:text-white"
                  placeholder="Search income..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <select
                id="category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Categories</option>
                {categories.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="account" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Account
              </label>
              <select
                id="account"
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Accounts</option>
                {accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={fetchIncomes}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Income Table */}
      <div className="bg-white dark:bg-gray-800 shadow dark:shadow-gray-900/20 overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredIncomes.map((income) => (
                <tr key={income.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(income.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {income.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: income.category.color + '20',
                        color: income.category.color || '#374151'
                      }}
                    >
                      {income.category.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {income.account.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {income.source || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 dark:text-green-400">
                    +${income.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        href={`/income/${income.id}/edit`}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteIncome(income.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredIncomes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No income found. Start by adding your first income!</p>
        </div>
      )}
    </div>
  )
}