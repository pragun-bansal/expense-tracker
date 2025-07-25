'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { PlusCircle, Filter, Search, Edit, Trash2 } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useCurrency } from '@/hooks/useCurrency'

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
  const { formatAmount } = useCurrency()
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
    return <CurrencyLoader />
  }

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-heading">Income</h1>
          <p className="mt-2 text-sm text-body">
            Total: {formatAmount(totalAmount)} ({filteredIncomes.length} entries)
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <Link
            href="/income/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-button-success px-4 py-2 text-sm font-medium text-button-success shadow-sm bg-button-success:hover focus:outline-none focus:ring-2 ring-focus focus:ring-offset-2 sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Income
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card shadow-card rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-input-label">
                Search
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-icon-neutral" />
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-input rounded-md leading-5 bg-input placeholder-text-muted focus:outline-none focus:placeholder-text-muted focus:ring-1 ring-focus border-input-focus:focus sm:text-sm text-input"
                  placeholder="Search income..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-input-label">
                Category
              </label>
              <select
                id="category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="mt-1 block w-full border-input rounded-md shadow-sm ring-focus border-input-focus:focus sm:text-sm bg-input text-input"
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
              <label htmlFor="account" className="block text-sm font-medium text-input-label">
                Account
              </label>
              <select
                id="account"
                value={filterAccount}
                onChange={(e) => setFilterAccount(e.target.value)}
                className="mt-1 block w-full border-input rounded-md shadow-sm ring-focus border-input-focus:focus sm:text-sm bg-input text-input"
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
                className="inline-flex items-center px-4 py-2 border border-input rounded-md shadow-sm text-sm font-medium text-button-secondary bg-button-secondary bg-button-secondary:hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-focus"
              >
                <Filter className="h-4 w-4 mr-2" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Income Table */}
      <div className="bg-card shadow-card overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y border-table">
            <thead className="bg-table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-table-header uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-table-header uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-table-header uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-table-header uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-table-header uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-table-header uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-table-header uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-table-row divide-y border-table">
              {filteredIncomes.map((income) => (
                <tr key={income.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-table-row">
                    {new Date(income.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-table-row">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-table-row">
                    {income.account.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-table-row">
                    {income.source || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-icon-success">
                    +{formatAmount(income.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        href={`/income/${income.id}/edit`}
                        className="text-link text-link:hover"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteIncome(income.id)}
                        className="text-icon-error hover:text-status-error"
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
          <p className="text-muted">No income found. Start by adding your first income!</p>
        </div>
      )}
    </div>
  )
}