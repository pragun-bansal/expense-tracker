'use client'

import { useState, useEffect, lazy, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { PlusCircle, Filter, Search, Edit, Trash2, Image } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useCurrency } from '@/hooks/useCurrency'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useModal } from '@/hooks/useModal'

// Lazy load modal components
const ConfirmModal = lazy(() => import('@/components/ConfirmModal'))

interface Expense {
  id: string
  amount: number
  description: string
  date: string
  receiptUrl?: string
  isRecurring: boolean
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

export default function Expenses() {
  const { data: session } = useSession()
  const { formatAmount } = useCurrency()
  const { confirmModal, showConfirm, closeConfirm } = useModal()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [filterLoading, setFilterLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterAccount, setFilterAccount] = useState('')
  const [categories, setCategories] = useState([])
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    if (session) {
      fetchExpenses()
      fetchCategories()
      fetchAccounts()
    }
  }, [session])

  const fetchExpenses = async () => {
    try {
      const params = new URLSearchParams({
        ...(filterCategory && { category: filterCategory }),
        ...(filterAccount && { account: filterAccount })
      })
      
      const response = await fetch(`/api/expenses?${params}`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data.expenses)
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
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

  const handleDeleteExpense = async (expenseId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense?',
      confirmText: 'Delete',
      type: 'danger'
    })
    
    if (!confirmed) {
      closeConfirm()
      return
    }

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setExpenses(expenses.filter(expense => expense.id !== expenseId))
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
    } finally {
      setDeleteLoading(false)
    }
    
    closeConfirm()
  }

  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-heading">Expenses</h1>
          <p className="mt-2 text-sm text-body">
            Total: {formatAmount(totalAmount)} ({filteredExpenses.length} expenses)
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <Link
            href="/expenses/new"
            className="inline-flex items-center justify-center w-full sm:w-auto rounded-md border border-transparent bg-button-primary px-4 py-2 text-sm font-medium text-button-primary shadow-sm bg-button-primary:hover focus:outline-none ring-focus focus:ring-2 focus:ring-offset-2"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Expense
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card shadow-card rounded-lg mb-8">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
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
                  placeholder="Search expenses..."
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
                onClick={() => {
                  setFilterLoading(true)
                  fetchExpenses().finally(() => setFilterLoading(false))
                }}
                disabled={filterLoading}
                className="inline-flex items-center justify-center w-full px-4 py-2 border border-input rounded-md shadow-sm text-sm font-medium text-button-secondary bg-button-secondary bg-button-secondary:hover focus:outline-none focus:ring-2 focus:ring-offset-2 ring-focus disabled:opacity-50"
              >
                {filterLoading ? <LoadingSpinner size="sm" /> : <Filter className="h-4 w-4 mr-2" />}
                {filterLoading ? 'Applying...' : 'Apply Filters'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-card shadow-card overflow-hidden rounded-lg">
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
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-table-header uppercase tracking-wider">
                  Receipt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-table-header uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-table-row divide-y border-table">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-table-row">
                    {new Date(expense.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-table-row">{expense.description}</div>
                    {expense.isRecurring && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-info text-status-info">
                        Recurring
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: expense.category.color + '20',
                        color: expense.category.color || '#374151'
                      }}
                    >
                      {expense.category.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-table-row">
                    {expense.account.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-heading">
                    {formatAmount(expense.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted">
                    {expense.receiptUrl ? (
                      <a
                        href={expense.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-link hover:text-link-hover"
                      >
                        <Image className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-gray-400">No receipt</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        href={`/expenses/${expense.id}/edit`}
                        className="text-link hover:text-link-hover"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        disabled={deleteLoading}
                        className="text-status-error hover:text-red-700 disabled:opacity-50"
                      >
                        {deleteLoading ? <LoadingSpinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredExpenses.map((expense) => (
          <div key={expense.id} className="bg-card shadow-card rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="text-sm font-medium text-heading">
                  {expense.description}
                </div>
                <div className="text-xs text-muted">
                  {new Date(expense.date).toLocaleDateString()}
                </div>
              </div>
              <div className="text-lg font-semibold text-heading">
                {formatAmount(expense.amount)}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: expense.category.color + '20',
                    color: expense.category.color || '#374151'
                  }}
                >
                  {expense.category.name}
                </span>
                <span className="text-xs text-muted">
                  {expense.account.name}
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {expense.receiptUrl && (
                  <a
                    href={expense.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-link hover:text-link-hover"
                  >
                    <Image className="h-4 w-4" />
                  </a>
                )}
                <Link
                  href={`/expenses/${expense.id}/edit`}
                  className="text-link hover:text-link-hover"
                >
                  <Edit className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => handleDeleteExpense(expense.id)}
                  disabled={deleteLoading}
                  className="text-status-error hover:text-red-700 disabled:opacity-50"
                >
                  {deleteLoading ? <LoadingSpinner size="sm" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            {expense.isRecurring && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-info text-status-info">
                  Recurring
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredExpenses.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted">No expenses found. Start by adding your first expense!</p>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <Suspense fallback={<div />}>
          <ConfirmModal
            isOpen={confirmModal.isOpen}
            onClose={closeConfirm}
            onConfirm={confirmModal.onConfirm}
            title={confirmModal.title}
            message={confirmModal.message}
            confirmText={confirmModal.confirmText}
            cancelText={confirmModal.cancelText}
            type={confirmModal.type}
            loading={confirmModal.loading}
          />
        </Suspense>
      )}
    </div>
  )
}