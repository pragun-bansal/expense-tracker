'use client'

// SAFE VERSION - Minimal changes, should not break existing functionality
import { useState, useEffect, lazy, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Filter, Search, ArrowUpCircle, ArrowDownCircle, Calendar, Download, Edit, Users, PlusCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useCurrency } from '@/hooks/useCurrency'
import { useModal } from '@/hooks/useModal'

// Only lazy load modals (safe, minimal change)
const AlertModal = lazy(() => import('@/components/AlertModal'))
const ConfirmModal = lazy(() => import('@/components/ConfirmModal'))

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
  const { formatAmount } = useCurrency()
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal()
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
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
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
      const response = await fetch('/api/transactions')
      if (response.ok) {
        const data = await response.json()
        setTransactions(data)
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

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-heading">Transactions</h1>
          <p className="text-muted">Manage all your financial transactions</p>
        </div>
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <Link
            href="/expenses/new"
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Expense
          </Link>
          <Link
            href="/income/new"
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Income
          </Link>
        </div>
      </div>

      {/* Basic search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-input rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>
      </div>

      {/* Simple transaction list */}
      <div className="space-y-4">
        {filteredTransactions.map((transaction) => (
          <div key={`${transaction.type}-${transaction.id}`} className="bg-card p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {transaction.type === 'income' ? (
                  <ArrowUpCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <ArrowDownCircle className="h-5 w-5 text-red-600" />
                )}
                <div>
                  <div className="font-medium">{transaction.description}</div>
                  <div className="text-sm text-muted">
                    {transaction.category?.name} • {new Date(transaction.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-semibold ${
                  transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatAmount(transaction.amount)}
                </div>
                <div className="text-sm text-muted">{transaction.account?.name}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted">No transactions found.</p>
        </div>
      )}

      {/* Modals with error boundaries */}
      {alertModal && (
        <Suspense fallback={<div />}>
          <AlertModal
            isOpen={alertModal?.isOpen || false}
            onClose={closeAlert}
            title={alertModal?.title || ''}
            message={alertModal?.message || ''}
            type={alertModal?.type || 'info'}
            confirmText={alertModal.confirmText}
          />
        </Suspense>
      )}

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