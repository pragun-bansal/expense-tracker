'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { 
  PlusCircle, 
  Filter, 
  Search, 
  Edit, 
  Trash2, 
  Image, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calendar, 
  Download, 
  Users,
  Plus,
  Eye,
  EyeOff
} from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'

interface UnifiedTransaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  description: string
  date: string
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
  source?: string
  receiptUrl?: string
  isRecurring?: boolean
  groupExpense?: {
    id: string
    group: {
      id: string
      name: string
    }
  }
  groupType?: 'LENDER' | 'BORROWER' | 'SETTLEMENT_RECEIVED' | 'SETTLEMENT_PAID'
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
}

export default function UnifiedTransactions() {
  const { data: session } = useSession()
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('all') // all, income, expense
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (session) {
      fetchTransactions()
      fetchCategories()
      fetchAccounts()
    }
  }, [session, filterType, filterCategory, filterAccount, dateRange, currentPage, sortBy, sortOrder])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(filterType && { type: filterType }),
        ...(filterCategory && { category: filterCategory }),
        ...(filterAccount && { account: filterAccount }),
        ...(dateRange.startDate && { startDate: dateRange.startDate }),
        ...(dateRange.endDate && { endDate: dateRange.endDate }),
        ...(sortBy && { sortBy }),
        ...(sortOrder && { sortOrder })
      })

      const response = await fetch(`/api/transactions?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setTransactions(data.transactions || [])
        setTotalPages(Math.ceil((data.pagination?.total || 0) / 20))
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (response.ok) {
        setCategories(data)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      const data = await response.json()
      if (response.ok) {
        setAccounts(data)
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const handleDelete = async (id: string, type: 'income' | 'expense') => {
    if (!confirm(`Are you sure you want to delete this ${type}?`)) return

    try {
      const endpoint = type === 'income' ? `/api/income/${id}` : `/api/expenses/${id}`
      const response = await fetch(endpoint, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchTransactions()
      }
    } catch (error) {
      console.error(`Error deleting ${type}:`, error)
    }
  }

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.account.name.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTab = activeTab === 'all' || transaction.type === activeTab
    
    return matchesSearch && matchesTab
  })

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const netAmount = totalIncome - totalExpenses

  const resetFilters = () => {
    setFilterType('')
    setFilterCategory('')
    setFilterAccount('')
    setDateRange({ startDate: '', endDate: '' })
    setSearchTerm('')
    setActiveTab('all')
  }

  const exportTransactions = () => {
    const csv = [
      ['Date', 'Type', 'Description', 'Category', 'Account', 'Amount', 'Group'].join(','),
      ...filteredTransactions.map(t => [
        t.date,
        t.type,
        `"${t.description}"`,
        t.category.name,
        t.account.name,
        t.amount,
        t.groupExpense?.group.name || ''
      ].join(','))
    ].join('\\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (!session) {
    return <div className="min-h-screen flex items-center justify-center">Please sign in to view transactions.</div>
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-heading">All Transactions</h1>
              <p className="text-muted mt-1">Unified view of all your income and expenses</p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/income/new"
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Income
              </Link>
              <Link
                href="/expenses/new"
                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Expense
              </Link>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-card rounded-lg p-4 border border-input">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Total Income</p>
                  <p className="text-2xl font-bold text-green-600">
                    <CurrencyLoader amount={totalIncome} />
                  </p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-input">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600">
                    <CurrencyLoader amount={totalExpenses} />
                  </p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-input">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Net Amount</p>
                  <p className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    <CurrencyLoader amount={netAmount} />
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-input">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">Total Transactions</p>
                  <p className="text-2xl font-bold text-heading">
                    {filteredTransactions.length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-card rounded-lg border border-input p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted h-4 w-4" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-input text-heading placeholder-muted"
              />
            </div>

            {/* Tab Filters */}
            <div className="flex bg-input rounded-lg p-1">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-card text-heading shadow-sm'
                    : 'text-muted hover:text-heading'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('income')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'income'
                    ? 'bg-card text-heading shadow-sm'
                    : 'text-muted hover:text-heading'
                }`}
              >
                Income
              </button>
              <button
                onClick={() => setActiveTab('expense')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'expense'
                    ? 'bg-card text-heading shadow-sm'
                    : 'text-muted hover:text-heading'
                }`}
              >
                Expenses
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-input rounded-lg hover:bg-button-secondary-hover transition-colors text-heading"
              >
                {showFilters ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
              <button
                onClick={exportTransactions}
                className="flex items-center gap-2 px-4 py-2 border border-input rounded-lg hover:bg-button-secondary-hover transition-colors text-heading"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-input">
              <div>
                <label className="block text-sm font-medium text-input-label mb-1">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-input text-heading"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-input-label mb-1">Account</label>
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-input text-heading"
                >
                  <option value="">All Accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-input-label mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-input text-heading"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-input-label mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-input text-heading"
                />
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {(filterCategory || filterAccount || dateRange.startDate || dateRange.endDate || searchTerm || activeTab !== 'all') && (
            <div className="mt-4 pt-4 border-t border-input">
              <button
                onClick={resetFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Transactions List */}
        <div className="bg-card rounded-lg border border-input overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-muted">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted">No transactions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-input">
                <thead className="bg-input">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-input-label uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-input-label uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-input-label uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-input-label uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-input-label uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-input-label uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-input-label uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-input">
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-button-secondary-hover">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-heading">
                        {new Date(transaction.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'income' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {transaction.type === 'income' ? (
                            <ArrowUpCircle className="h-3 w-3" />
                          ) : (
                            <ArrowDownCircle className="h-3 w-3" />
                          )}
                          {transaction.type === 'income' ? 'Income' : 'Expense'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-heading">
                        <div className="flex items-center gap-2">
                          <span>{transaction.description}</span>
                          {transaction.receiptUrl && (
                            <Image className="h-4 w-4 text-muted" />
                          )}
                          {transaction.isRecurring && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                              Recurring
                            </span>
                          )}
                          {transaction.groupExpense && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                              <Users className="h-3 w-3" />
                              {transaction.groupExpense.group.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-heading">
                        <div className="flex items-center gap-2">
                          {transaction.category.color && (
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: transaction.category.color }}
                            ></div>
                          )}
                          {transaction.category.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-heading">
                        {transaction.account.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                          {transaction.type === 'income' ? '+' : '-'}
                          <CurrencyLoader amount={transaction.amount} />
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/${transaction.type}/${transaction.id}/edit`}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(transaction.id, transaction.type)}
                            className="text-red-600 hover:text-red-700"
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
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-muted">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-input rounded hover:bg-button-secondary-hover disabled:opacity-50 disabled:cursor-not-allowed text-heading"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-input rounded hover:bg-button-secondary-hover disabled:opacity-50 disabled:cursor-not-allowed text-heading"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}