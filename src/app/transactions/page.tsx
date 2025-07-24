'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Filter, Search, ArrowUpCircle, ArrowDownCircle, Calendar, Download, Edit, Users, PlusCircle } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'

interface Transaction {
  id: string
  type: 'income' | 'expense' | 'lending' | 'borrowing'
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

export default function Transactions() {
  const { data: session } = useSession()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState('desc')
  
  // Edit functionality state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    if (session) {
      fetchTransactions()
      fetchCategories()
      fetchAccounts()
    }
  }, [session])

  const fetchTransactions = async () => {
    try {
      setLoading(true)
      
      // Fetch all transaction types
      const [expenseResponse, incomeResponse, lendingResponse, borrowingResponse] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/income'),
        fetch('/api/lending'),
        fetch('/api/borrowing')
      ])
      
      // Check for API errors
      if (!expenseResponse.ok) console.error('Expenses API error:', expenseResponse.status)
      if (!incomeResponse.ok) console.error('Income API error:', incomeResponse.status)
      if (!lendingResponse.ok) console.error('Lending API error:', lendingResponse.status)
      if (!borrowingResponse.ok) console.error('Borrowing API error:', borrowingResponse.status)
      
      const [expenseData, incomeData, lendingData, borrowingData] = await Promise.all([
        expenseResponse.json(),
        incomeResponse.json(),
        lendingResponse.json(),
        borrowingResponse.json()
      ])
      
      
      // Combine and format transactions
      const expenseTransactions = expenseData.expenses?.map((expense: any) => ({
        ...expense,
        type: 'expense' as const
      })) || []
      
      const incomeTransactions = incomeData.incomes?.map((income: any) => ({
        ...income,
        type: 'income' as const
      })) || []
      
      const lendingTransactions = lendingData.lendings?.map((lending: any) => ({
        ...lending,
        type: 'lending' as const
      })) || []
      
      const borrowingTransactions = borrowingData.borrowings?.map((borrowing: any) => ({
        ...borrowing,
        type: 'borrowing' as const
      })) || []
      
      const allTransactions = [...expenseTransactions, ...incomeTransactions, ...lendingTransactions, ...borrowingTransactions]
      
      // Sort transactions
      allTransactions.sort((a, b) => {
        const dateA = new Date(a.date)
        const dateB = new Date(b.date)
        return sortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
      })
      
      setTransactions(allTransactions)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const [expenseResponse, incomeResponse] = await Promise.all([
        fetch('/api/categories?type=EXPENSE'),
        fetch('/api/categories?type=INCOME')
      ])
      
      const [expenseData, incomeData] = await Promise.all([
        expenseResponse.json(),
        incomeResponse.json()
      ])
      
      setCategories([...expenseData, ...incomeData])
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

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.source && transaction.source.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = !filterType || transaction.type === filterType
    const matchesCategory = !filterCategory || transaction.category?.id === filterCategory
    const matchesAccount = !filterAccount || transaction.account?.id === filterAccount
    
    const matchesDateRange = (!dateRange.startDate || new Date(transaction.date) >= new Date(dateRange.startDate)) &&
                            (!dateRange.endDate || new Date(transaction.date) <= new Date(dateRange.endDate))
    
    return matchesSearch && matchesType && matchesCategory && matchesAccount && matchesDateRange
  })

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalExpenses = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalLending = filteredTransactions
    .filter(t => t.type === 'lending')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalBorrowing = filteredTransactions
    .filter(t => t.type === 'borrowing')
    .reduce((sum, t) => sum + t.amount, 0)
  

  const exportTransactions = () => {
    const csvContent = [
      ['Date', 'Type', 'Description', 'Category', 'Account', 'Amount', 'Source/Receipt'],
      ...filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString(),
        t.type,
        t.description,
        t.category.name,
        t.account.name,
        t.amount.toFixed(2),
        t.source || t.receiptUrl || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSaveTransaction = async (updatedTransaction: any) => {
    try {
      const endpoint = updatedTransaction.type === 'income' ? '/api/income' : 
                      updatedTransaction.type === 'expense' ? '/api/expenses' :
                      updatedTransaction.type === 'lending' ? '/api/lending' : '/api/borrowing'
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTransaction)
      })

      if (response.ok) {
        setShowEditModal(false)
        setEditingTransaction(null)
        fetchTransactions() // Refresh the transactions list
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update transaction')
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
      alert('Failed to update transaction')
    }
  }

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div>
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-heading">Transaction History</h1>
          <p className="mt-2 text-sm text-body">
            All your income and expenses in one place
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-2">
          <Link
            href="/income/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-button-success px-4 py-2 text-sm font-medium text-button-success shadow-sm bg-button-success:hover focus:outline-none focus:ring-2 ring-focus focus:ring-offset-2 sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Income
          </Link>
          <Link
            href="/expenses/new"
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-button-primary px-4 py-2 text-sm font-medium text-button-primary shadow-sm bg-button-primary:hover focus:outline-none ring-focus focus:ring-2 focus:ring-offset-2 sm:w-auto"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Expense
          </Link>
          <button
            onClick={exportTransactions}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg shadow-card">
          <div className="flex items-center">
            <ArrowUpCircle className="h-8 w-8 text-status-success" />
            <div className="ml-4">
              <p className="text-sm font-medium text-body">Total Income</p>
              <p className="text-2xl font-semibold text-status-success">
                ${totalIncome.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow-card">
          <div className="flex items-center">
            <ArrowDownCircle className="h-8 w-8 text-status-error" />
            <div className="ml-4">
              <p className="text-sm font-medium text-body">Total Expenses</p>
              <p className="text-2xl font-semibold text-status-error">
                ${totalExpenses.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow-card">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-body">Total Lending</p>
              <p className="text-2xl font-semibold text-green-600">
                ${totalLending.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow-card">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-body">Total Borrowing</p>
              <p className="text-2xl font-semibold text-orange-600">
                ${totalBorrowing.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow-card">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-status-info" />
            <div className="ml-4">
              <p className="text-sm font-medium text-body">Net Amount</p>
              <p className={`text-2xl font-semibold ${totalIncome - totalExpenses >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                ${(totalIncome - totalExpenses).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card shadow-card rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-input-label">
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
                  className="block w-full pl-10 pr-3 py-2 border border-input rounded-md leading-5 bg-input placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 ring-focus focus:border-blue-500 sm:text-sm text-heading"
                  placeholder="Search transactions..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-input-label">
                Type
              </label>
              <select
                id="type"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="mt-1 block w-full border-input rounded-md shadow-sm ring-focus focus:border-blue-500 sm:text-sm bg-input text-heading"
              >
                <option value="">All Types</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="lending">Lending</option>
                <option value="borrowing">Borrowing</option>
              </select>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-input-label">
                Category
              </label>
              <select
                id="category"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="mt-1 block w-full border-input rounded-md shadow-sm ring-focus focus:border-blue-500 sm:text-sm bg-input text-heading"
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
                className="mt-1 block w-full border-input rounded-md shadow-sm ring-focus focus:border-blue-500 sm:text-sm bg-input text-heading"
              >
                <option value="">All Accounts</option>
                {accounts.map((account: any) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-input-label">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="mt-1 block w-full border-input rounded-md shadow-sm ring-focus focus:border-blue-500 sm:text-sm bg-input text-heading"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-input-label">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="mt-1 block w-full border-input rounded-md shadow-sm ring-focus focus:border-blue-500 sm:text-sm bg-input text-heading"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-card shadow-card overflow-hidden rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-table-border">
            <thead className="bg-muted">
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
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-input-label uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-table-border">
              {filteredTransactions.map((transaction) => (
                <tr key={`${transaction.type}-${transaction.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-heading">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {transaction.type === 'income' ? (
                        <ArrowUpCircle className="h-4 w-4 text-status-success mr-2" />
                      ) : transaction.type === 'expense' ? (
                        <ArrowDownCircle className="h-4 w-4 text-status-error mr-2" />
                      ) : transaction.type === 'lending' ? (
                        <Users className="h-4 w-4 text-green-600 mr-2" />
                      ) : (
                        <Users className="h-4 w-4 text-orange-600 mr-2" />
                      )}
                      <span className={`text-sm font-medium ${
                        transaction.type === 'income' ? 'text-status-success' : 
                        transaction.type === 'expense' ? 'text-status-error' :
                        transaction.type === 'lending' ? 'text-green-600' : 'text-orange-600'
                      }`}>
                        {transaction.type === 'income' ? 'Income' : 
                         transaction.type === 'expense' ? 'Expense' :
                         transaction.type === 'lending' ? 'Lending' : 'Borrowing'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-heading">{transaction.description}</div>
                    <div className="flex items-center space-x-2 mt-1">
                      {transaction.isRecurring && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-info text-status-info">
                          Recurring
                        </span>
                      )}
                      {transaction.groupExpense && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-info text-status-info">
                          <Users className="h-3 w-3 mr-1" />
                          Group
                        </span>
                      )}
                      {transaction.groupType && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-body">
                          {transaction.groupType.replace('_', ' ').toLowerCase()}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: transaction.category.color + '20',
                        color: transaction.category.color || '#374151'
                      }}
                    >
                      {transaction.category.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-heading">
                    {transaction.account.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={
                      transaction.type === 'income' ? 'text-status-success' : 
                      transaction.type === 'expense' ? 'text-status-error' :
                      transaction.type === 'lending' ? 'text-green-600' : 'text-orange-600'
                    }>
                      {transaction.type === 'income' || transaction.type === 'lending' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-heading">
                    {transaction.groupExpense ? (
                      <div>
                        <div className="font-medium text-status-info">
                          {transaction.groupExpense.group.name}
                        </div>
                        <div className="text-xs text-muted">
                          Group Transaction
                        </div>
                      </div>
                    ) : transaction.source ? (
                      transaction.source
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {!transaction.groupExpense && (transaction.type === 'income' || transaction.type === 'expense') ? (
                      <button
                        onClick={() => {
                          setEditingTransaction(transaction)
                          setShowEditModal(true)
                        }}
                        className="text-link hover:text-link-hover"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    ) : transaction.groupExpense ? (
                      <span className="text-gray-400 text-xs">Group transaction</span>
                    ) : (
                      <span className="text-gray-400 text-xs">Group lending/borrowing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted">No transactions found. Try adjusting your filters.</p>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && editingTransaction && (
        <div className="fixed inset-0 bg-modal-overlay overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-heading mb-4">
                Edit {editingTransaction.type === 'income' ? 'Income' : 
                      editingTransaction.type === 'expense' ? 'Expense' :
                      editingTransaction.type === 'lending' ? 'Lending' : 'Borrowing'}
              </h3>
              <EditTransactionForm 
                transaction={editingTransaction}
                categories={categories}
                accounts={accounts}
                onSave={handleSaveTransaction}
                onCancel={() => setShowEditModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Edit Transaction Form Component
function EditTransactionForm({ 
  transaction, 
  categories, 
  accounts, 
  onSave, 
  onCancel 
}: {
  transaction: Transaction
  categories: any[]
  accounts: any[]
  onSave: (updatedTransaction: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    amount: transaction.amount,
    description: transaction.description || '',
    categoryId: transaction.category.id,
    accountId: transaction.account.id,
    date: transaction.date.split('T')[0], // Convert to YYYY-MM-DD format
    source: transaction.source || ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      id: transaction.id,
      type: transaction.type
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-input-label mb-1">
          Amount *
        </label>
        <input
          type="number"
          step="0.01"
          required
          value={formData.amount}
          onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
          className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-input-label mb-1">
          Description
        </label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-input-label mb-1">
          Category *
        </label>
        <select
          required
          value={formData.categoryId}
          onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
          className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
        >
          {categories.filter(cat => cat.type === transaction.type.toUpperCase()).map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-input-label mb-1">
          Account *
        </label>
        <select
          required
          value={formData.accountId}
          onChange={(e) => setFormData({...formData, accountId: e.target.value})}
          className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
        >
          {accounts.map(account => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.type})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-input-label mb-1">
          Date *
        </label>
        <input
          type="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({...formData, date: e.target.value})}
          className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
        />
      </div>

      {transaction.type === 'income' && (
        <div>
          <label className="block text-sm font-medium text-input-label mb-1">
            Source
          </label>
          <input
            type="text"
            value={formData.source}
            onChange={(e) => setFormData({...formData, source: e.target.value})}
            className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
          />
        </div>
      )}

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-input-label border border-input rounded-md hover:bg-button-secondary-hover"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Save Changes
        </button>
      </div>
    </form>
  )
}