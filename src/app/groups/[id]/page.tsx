'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, DollarSign, Users, Receipt, Check, X, Trash2, Edit, ChevronDown, ChevronUp } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { formatActivityDescription } from '@/lib/activityLogger'
import { useCurrency } from '@/hooks/useCurrency'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useModal } from '@/hooks/useModal'
import AlertModal from '@/components/AlertModal'
import ConfirmModal from '@/components/ConfirmModal'

interface Account {
  id: string
  name: string
  type: string
}

interface GroupLender {
  id: string
  amount: number
  user: {
    id: string
    name: string
    email: string
  }
  account?: Account
}

interface GroupExpense {
  id: string
  description: string
  amount: number
  date: string
  splitType: string
  receiptUrl?: string
  account?: Account
  lenders: GroupLender[]
  splits: Array<{
    id: string
    amount: number
    settled: boolean
    user: {
      id: string
      name: string
      email: string
    }
    settlementAccount?: Account
  }>
}

interface Group {
  id: string
  name: string
  description?: string
  members: Array<{
    id: string
    role: string
    user: {
      id: string
      name: string
      email: string
    }
  }>
  expenses: GroupExpense[]
}

interface Balance {
  userId: string
  user: {
    name: string
    email: string
  }
  balance: number
}

interface Settlement {
  from: {
    id: string
    name: string
    email: string
  }
  to: {
    id: string
    name: string
    email: string
  }
  amount: number
}

interface GroupStats {
  totalAmount: number
  totalExpenses: number
  averageExpense: number
  totalMembers: number
  memberStats: Array<{
    user: {
      id: string
      name: string
      email: string
    }
    totalLent: number
    totalBorrowed: number
    totalExpenses: number
    netBalance: number
  }>
  topLender?: {
    user: {
      id: string
      name: string
      email: string
    }
    totalLent: number
    totalBorrowed: number
    totalExpenses: number
    netBalance: number
  }
  topBorrower?: {
    user: {
      id: string
      name: string
      email: string
    }
    totalLent: number
    totalBorrowed: number
    totalExpenses: number
    netBalance: number
  }
}

export default function GroupDetail({ params }: { params: Promise<{ id: string }> }) {
  const { data: session } = useSession()
  const { formatAmount } = useCurrency()
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal()
  const router = useRouter()
  const { id } = React.use(params)
  const [group, setGroup] = useState<Group | null>(null)
  const [expenses, setExpenses] = useState<GroupExpense[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [suggestedSettlements, setSuggestedSettlements] = useState<any[]>([]) // For Outstanding Balances tab
  const [recordedSettlements, setRecordedSettlements] = useState<any[]>([]) // For Settlement History tab
  const [stats, setStats] = useState<GroupStats | null>(null)
  const [activities, setActivities] = useState<any[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showEditExpense, setShowEditExpense] = useState(false)
  const [editingExpense, setEditingExpense] = useState<GroupExpense | null>(null)
  const [showSettleModal, setShowSettleModal] = useState(false)
  const [settleData, setSettleData] = useState<{fromUserId?: string, toUserId?: string, amount?: number, isLender?: boolean}>({ })
  const [settlementAccountId, setSettlementAccountId] = useState('')
  const [settleDebtLoading, setSettleDebtLoading] = useState(false)
  const [addExpenseLoading, setAddExpenseLoading] = useState(false)
  const [deleteExpenseLoading, setDeleteExpenseLoading] = useState(false)
  const [deleteSettlementLoading, setDeleteSettlementLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances' | 'stats' | 'settlements' | 'activity'>('expenses')
  const [showEditSettlement, setShowEditSettlement] = useState(false)
  const [editingSettlement, setEditingSettlement] = useState<any>(null)
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set())

  const toggleExpenseExpansion = (expenseId: string) => {
    const newExpanded = new Set(expandedExpenses)
    if (newExpanded.has(expenseId)) {
      newExpanded.delete(expenseId)
    } else {
      newExpanded.add(expenseId)
    }
    setExpandedExpenses(newExpanded)
  }

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    splitType: 'EQUAL',
    accountId: '',
    splits: [] as Array<{ userId: string; amount: number; selected: boolean }>,
    lenders: [] as Array<{ userId: string; amount: number; accountId: string; selected: boolean }>
  })

  useEffect(() => {
    if (session) {
      fetchGroup()
      fetchExpenses()
      fetchBalances()
      fetchStats()
      fetchAccounts()
      fetchSettlements()
      fetchActivities()
    }
  }, [session])

  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${id}`)
      if (response.ok) {
        const data = await response.json()
        setGroup(data)
      }
    } catch (error) {
      console.error('Error fetching group:', error)
    }
  }

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`/api/groups/${id}/expenses`)
      if (response.ok) {
        const data = await response.json()
        setExpenses(data)
      }
    } catch (error) {
      console.error('Error fetching expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBalances = async () => {
    try {
      const response = await fetch(`/api/groups/${id}/balances`)
      if (response.ok) {
        const data = await response.json()
        setBalances(data.balances)
        setSuggestedSettlements(data.settlements) // Settlement suggestions
      }
    } catch (error) {
      console.error('Error fetching balances:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/groups/${id}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
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

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group) return
    setAddExpenseLoading(true)

    try {
      let splits = newExpense.splits
      let lenders = newExpense.lenders
      
      // Validate lenders
      const selectedLenders = newExpense.lenders.filter(lender => lender.selected)
      if (selectedLenders.length === 0) {
        showAlert({
          title: 'Validation Error',
          message: 'Please select at least one lender for the expense',
          type: 'warning'
        })
        return
      }

      // Handle lender amounts
      if (selectedLenders.length === 1) {
        // Single lender gets the full amount
        lenders = [{
          ...selectedLenders[0],
          amount: parseFloat(newExpense.amount)
        }]
      } else {
        // Multiple lenders - check if amounts are specified
        const totalLenderAmount = selectedLenders.reduce((sum, lender) => sum + lender.amount, 0)
        if (Math.abs(totalLenderAmount - parseFloat(newExpense.amount)) > 0.01) {
          showAlert({
            title: 'Validation Error',
            message: 'Lender amounts must equal the total expense amount',
            type: 'warning'
          })
          return
        }
        lenders = selectedLenders
      }
      
      if (newExpense.splitType === 'EQUAL') {
        // Equal split among selected members
        const selectedMembers = newExpense.splits.filter(split => split.selected)
        if (selectedMembers.length === 0) {
          showAlert({
            title: 'Validation Error',
            message: 'Please select at least one member for the split',
            type: 'warning'
          })
          return
        }
        const splitAmount = parseFloat(newExpense.amount) / selectedMembers.length
        splits = selectedMembers.map(split => ({
          userId: split.userId,
          amount: splitAmount,
          selected: true
        }))
      } else if (newExpense.splitType === 'CUSTOM') {
        // Custom split amounts
        const selectedSplits = newExpense.splits.filter(split => split.selected && split.amount > 0)
        if (selectedSplits.length === 0) {
          showAlert({
            title: 'Validation Error',
            message: 'Please select members and specify amounts for custom split',
            type: 'warning'
          })
          return
        }
        
        const totalSplitAmount = selectedSplits.reduce((sum, split) => sum + split.amount, 0)
        if (Math.abs(totalSplitAmount - parseFloat(newExpense.amount)) > 0.01) {
          showAlert({
            title: 'Validation Error',
            message: 'Split amounts must equal the total expense amount',
            type: 'warning'
          })
          return
        }
        
        splits = selectedSplits
      }

      const response = await fetch(`/api/groups/${id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          splitType: newExpense.splitType,
          accountId: newExpense.accountId || null,
          splits: splits.map(split => ({
            userId: split.userId,
            amount: split.amount
          })),
          lenders: lenders.map(lender => ({
            userId: lender.userId,
            amount: lender.amount,
            accountId: lender.accountId || null
          }))
        })
      })

      if (response.ok) {
        setShowAddExpense(false)
        setNewExpense({
          description: '',
          amount: '',
          splitType: 'EQUAL',
          accountId: '',
          splits: [],
          lenders: []
        })
        fetchExpenses()
        fetchBalances()
        fetchStats()
        fetchActivities()
        showAlert({
          title: 'Success',
          message: 'Expense added successfully!',
          type: 'success'
        })
      } else {
        showAlert({
          title: 'Error',
          message: 'Failed to add expense. Please try again.',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error adding expense:', error)
      showAlert({
        title: 'Error',
        message: 'An error occurred while adding the expense.',
        type: 'error'
      })
    } finally {
      setAddExpenseLoading(false)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense?',
      type: 'danger'
    })
    if (!confirmed) {
      closeConfirm()
      return
    }

    setDeleteExpenseLoading(true)
    
    try {
      const response = await fetch(`/api/groups/${id}/expenses/${expenseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        closeConfirm()
        fetchExpenses()
        fetchBalances()
        fetchStats()
        fetchActivities()
      } else {
        const error = await response.json()
        closeConfirm()
        showAlert({
          title: 'Delete Failed',
          message: error.error || 'Failed to delete expense',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
      closeConfirm()
      showAlert({
        title: 'Delete Failed',
        message: 'Failed to delete expense',
        type: 'error'
      })
    } finally {
      setDeleteExpenseLoading(false)
    }
  }

  const handleEditExpense = (expense: GroupExpense) => {
    setEditingExpense(expense)
    setShowEditExpense(true)
  }

  const initializeSplits = () => {
    if (!group) return
    
    const splits = group.members.map(member => ({
      userId: member.user.id,
      amount: 0,
      selected: newExpense.splitType === 'EQUAL'
    }))

    const lenders = group.members.map(member => ({
      userId: member.user.id,
      amount: 0,
      accountId: '',
      selected: member.user.id === session?.user?.id // Select current user as default lender
    }))
    
    setNewExpense(prev => ({ ...prev, splits, lenders }))
  }

  const updateSplitSelection = (userId: string, selected: boolean) => {
    setNewExpense(prev => ({
      ...prev,
      splits: prev.splits.map(split => 
        split.userId === userId ? { ...split, selected } : split
      )
    }))
  }

  const updateSplitAmount = (userId: string, amount: number) => {
    setNewExpense(prev => ({
      ...prev,
      splits: prev.splits.map(split => 
        split.userId === userId ? { ...split, amount } : split
      )
    }))
  }

  const updateLenderSelection = (userId: string, selected: boolean) => {
    setNewExpense(prev => ({
      ...prev,
      lenders: prev.lenders.map(lender => 
        lender.userId === userId ? { ...lender, selected } : lender
      )
    }))
  }

  const updateLenderAmount = (userId: string, amount: number) => {
    setNewExpense(prev => ({
      ...prev,
      lenders: prev.lenders.map(lender => 
        lender.userId === userId ? { ...lender, amount } : lender
      )
    }))
  }

  const updateLenderAccount = (userId: string, accountId: string) => {
    setNewExpense(prev => ({
      ...prev,
      lenders: prev.lenders.map(lender => 
        lender.userId === userId ? { ...lender, accountId } : lender
      )
    }))
  }

  const initiateBalanceSettle = (fromUserId: string, toUserId: string, amount: number) => {
    const isLender = session?.user?.id === toUserId
    setSettleData({ fromUserId, toUserId, amount, isLender })
    setSettlementAccountId('')
    setShowSettleModal(true)
  }

  const fetchSettlements = async () => {
    try {
      const response = await fetch(`/api/groups/${id}/settlements`)
      if (response.ok) {
        const data = await response.json()
        setRecordedSettlements(data.settlements || [])
      } else {
        console.error('Failed to fetch settlements:', response.status)
        setRecordedSettlements([])
      }
    } catch (error) {
      console.error('Error fetching settlements:', error)
      setRecordedSettlements([])
    }
  }

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/groups/${id}/activities`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      } else {
        console.error('Failed to fetch activities:', response.status)
        setActivities([])
      }
    } catch (error) {
      console.error('Error fetching activities:', error)
      setActivities([])
    }
  }

  const handleSettleDebt = async () => {
    setSettleDebtLoading(true)
    try {
      const response = await fetch(`/api/groups/${id}/settle-balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fromUserId: settleData.fromUserId,
          toUserId: settleData.toUserId,
          amount: settleData.amount,
          settlementAccountId: settlementAccountId || null
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        // Close modal and reset state immediately
        setShowSettleModal(false)
        setSettleData({})
        setSettlementAccountId('')
        
        // Refresh all data after closing modal
        await Promise.all([
          fetchExpenses(),
          fetchBalances(), 
          fetchStats(),
          fetchActivities(),
          fetchSettlements()
        ])
        
        // Show success message
        showAlert({
          title: 'Settlement Recorded',
          message: `Settlement recorded successfully! Amount: ${formatAmount(result.settledAmount || settleData.amount)}`,
          type: 'success'
        })
      } else {
        const error = await response.json()
        showAlert({
          title: 'Settlement Failed',
          message: error.error || 'Failed to record settlement',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error settling balance:', error)
      showAlert({
        title: 'Settlement Failed',
        message: 'Failed to record settlement due to network error',
        type: 'error'
      })
    } finally {
      setSettleDebtLoading(false)
    }
  }

  const handleUpdateSettlement = async (settlementId: string, accountId: string, accountType: 'borrower' | 'lender') => {
    try {
      const updateData = accountType === 'borrower' 
        ? { borrowerAccountId: accountId || null }
        : { lenderAccountId: accountId || null }

      const response = await fetch(`/api/settlements/${settlementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        setShowEditSettlement(false)
        setEditingSettlement(null)
        fetchSettlements()
        // Refresh transactions by refetching balances which includes settlement data
        fetchBalances()
      } else {
        const error = await response.json()
        showAlert({
          title: 'Update Failed',
          message: error.error || 'Failed to update settlement',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error updating settlement:', error)
      showAlert({
        title: 'Update Failed',
        message: 'Failed to update settlement',
        type: 'error'
      })
    } finally {
      setUpdateSettlementLoading(false)
    }
  }

  const handleDeleteSettlement = async (settlementId: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Settlement',
      message: 'Are you sure you want to delete this settlement? This will unsettle the related expenses.',
      type: 'danger'
    })
    if (!confirmed) {
      closeConfirm()
      return
    }

    try {
      const response = await fetch(`/api/settlements/${settlementId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        closeConfirm()
        fetchExpenses()
        fetchBalances()
        fetchStats()
        fetchActivities()
        fetchSettlements()
        showAlert({
          title: 'Settlement Deleted',
          message: 'Settlement deleted successfully',
          type: 'success'
        })
      } else {
        const error = await response.json()
        closeConfirm()
        showAlert({
          title: 'Delete Failed',
          message: error.error || 'Failed to delete settlement',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error deleting settlement:', error)
      closeConfirm()
      showAlert({
        title: 'Delete Failed',
        message: 'Failed to delete settlement',
        type: 'error'
      })
    } finally {
      setDeleteSettlementLoading(false)
    }
  }

  if (loading) {
    return <CurrencyLoader />
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Group not found</div>
      </div>
    )
  }

  const myUnsettledSplits = expenses.flatMap(expense => 
    expense.splits.filter(split => 
      split.user.id === session?.user?.id && !split.settled
    )
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 sm:mb-8 flex items-center justify-between">
        <Link
          href="/groups"
          className="inline-flex items-center text-sm font-medium text-muted hover:text-body"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Groups
        </Link>
        <button
            onClick={() => {
              setShowAddExpense(true)
              setTimeout(initializeSplits, 100)
            }}
          className="inline-flex sm:hidden items-center px-3 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors duration-200"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          Add Expense
        </button>
      </div>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 sm:mb-8">
        <div className="mb-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-heading">{group.name}</h1>
          {group.description && (
            <p className="mt-2 text-sm text-muted">
              {group.description}
            </p>
          )}
          <div className="flex-row sm:mt-4 flex items-center space-y-0 space-x-4">
            <div className="flex -space-x-2 overflow-x-auto">
              {group.members.map((member) => (
                  <div
                      key={member.id}
                      className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium border-2 border-card flex-shrink-0"
                      title={member.user.name}
                  >
                    {member.user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
              ))}
            </div>
            <div className="flex items-center">
              {/*<Users className="h-4 w-4 text-gray-400 mr-1" />*/}
              <span className="text-sm text-muted">
                {group.members.length} members
              </span>
            </div>

          </div>
        </div>
        <div className="w-full sm:w-auto hidden sm:block">
          <button
            onClick={() => {
              setShowAddExpense(true)
              setTimeout(initializeSplits, 100)
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-card-border mb-6 sm:mb-8">
        <div className="overflow-x-auto scrollbar-thin">
          <nav className="flex space-x-3 sm:space-x-8 min-w-max sm:min-w-0">
            <button
              onClick={() => setActiveTab('expenses')}
              className={`py-2 px-3 sm:px-2 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === 'expenses'
                  ? 'border-blue-500 text-status-info'
                  : 'border-transparent text-muted hover:text-body'
              }`}
            >
              Expenses
            </button>
            <button
              onClick={() => setActiveTab('balances')}
              className={`py-2 px-3 sm:px-2 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === 'balances'
                  ? 'border-blue-500 text-status-info'
                  : 'border-transparent text-muted hover:text-body'
              }`}
            >
              Balances
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-2 px-3 sm:px-2 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-status-info'
                  : 'border-transparent text-muted hover:text-body'
              }`}
            >
              Statistics
            </button>
            <button
              onClick={() => setActiveTab('settlements')}
              className={`py-2 px-3 sm:px-2 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === 'settlements'
                  ? 'border-blue-500 text-status-info'
                  : 'border-transparent text-muted hover:text-body'
              }`}
            >
              Settlements
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`py-2 px-3 sm:px-2 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-status-info'
                  : 'border-transparent text-muted hover:text-body'
              }`}
            >
              Activity
            </button>
          </nav>
        </div>
      </div>

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Desktop View */}
          <div className="hidden lg:block space-y-4">
            {expenses.map((expense) => {
              const myShare = expense.splits.find(split => split.user.id === session?.user?.id)
              const isLentByMe = expense.lenders.some(lender => lender.user.id === session?.user?.id)
              const lenderNames = expense.lenders.map(lender => lender.user.name).join(', ')

              return (
                <div key={expense.id} className="bg-card rounded-lg shadow-card p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Receipt className="h-5 w-5 text-gray-400 mr-2" />
                        <h3 className="text-lg font-medium text-heading">
                          {expense.description}
                        </h3>
                      </div>
                      <div className="mt-2 flex items-center space-x-4 text-sm text-muted">
                        <span>Paid by {lenderNames}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{expense.splitType.toLowerCase()} split</span>
                        {expense.account && (
                          <>
                            <span>•</span>
                            <span>Account: {expense.account.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-heading">
                        {formatAmount(expense.amount)}
                      </div>
                      {myShare && (
                        <div className={`text-sm ${myShare.settled ? 'text-status-success' : 'text-status-error'}`}>
                          Your share: {formatAmount(myShare.amount)}
                          {myShare.settled ? ' (settled)' : ' (unsettled)'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Split details */}
                  <div className="mt-4 border-t border-card-border pt-4">
                    <h4 className="text-sm font-medium text-heading mb-2">Split Details</h4>
                    <div className="space-y-2">
                      {expense.splits.map((split) => {
                        const isLender = expense.lenders.some(lender => lender.user.id === split.user.id)
                        const lenderAmount = expense.lenders.find(lender => lender.user.id === split.user.id)?.amount || 0
                        
                        return (
                          <div key={split.id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium mr-3">
                                {split.user.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <span className="text-sm text-heading">
                                {split.user.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-heading">
                                {formatAmount(split.amount)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-4 border-t border-card-border pt-4 flex items-center justify-end">
                    {/* Edit and Delete buttons - only for admins or lenders */}
                    {(group?.members.find(m => m.user.id === session?.user?.id)?.role === 'ADMIN' || isLentByMe) && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEditExpense(expense)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-3">
            {expenses.map((expense) => {
              const myShare = expense.splits.find(split => split.user.id === session?.user?.id)
              const isLentByMe = expense.lenders.some(lender => lender.user.id === session?.user?.id)
              const lenderNames = expense.lenders.map(lender => lender.user.name).join(', ')
              const isExpanded = expandedExpenses.has(expense.id)

              return (
                <div key={expense.id} className="bg-card rounded-lg shadow-card overflow-hidden">
                  {/* Collapsible Header */}
                  <div 
                    className="p-3 sm:p-4 cursor-pointer"
                    onClick={() => toggleExpenseExpansion(expense.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                        <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-heading truncate">
                            {expense.description}
                          </h3>
                          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 mt-1">
                            <p className="text-xs text-muted">
                              {new Date(expense.date).toLocaleDateString()}
                            </p>
                            {myShare && (
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <span className="text-xs text-muted hidden sm:inline">•</span>
                                <span className={`text-xs whitespace-nowrap ${myShare.settled ? 'text-status-success' : 'text-status-error'}`}>
                                  You: {formatAmount(myShare.amount)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-sm sm:text-lg font-bold text-heading">
                            {formatAmount(expense.amount)}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-table-border">
                      <div className="space-y-4 mt-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-xs font-medium text-input-label uppercase tracking-wider mb-1">
                              Paid By
                            </p>
                            <p className="text-heading">{lenderNames}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-input-label uppercase tracking-wider mb-1">
                              Split Type
                            </p>
                            <p className="text-heading">{expense.splitType.toLowerCase()}</p>
                          </div>
                          {expense.account && (
                            <div className="col-span-2">
                              <p className="text-xs font-medium text-input-label uppercase tracking-wider mb-1">
                                Account
                              </p>
                              <p className="text-heading">{expense.account.name}</p>
                            </div>
                          )}
                        </div>

                        {/* Split Details */}
                        <div>
                          <p className="text-xs font-medium text-input-label uppercase tracking-wider mb-2">
                            Split Details
                          </p>
                          <div className="space-y-2">
                            {expense.splits.map((split) => (
                              <div key={split.id} className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium mr-2">
                                    {split.user.name?.[0]?.toUpperCase() || 'U'}
                                  </div>
                                  <span className="text-sm text-heading">
                                    {split.user.name}
                                  </span>
                                </div>
                                <span className="text-sm text-heading">
                                  {formatAmount(split.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {(group?.members.find(m => m.user.id === session?.user?.id)?.role === 'ADMIN' || isLentByMe) && (
                          <div className="flex justify-end space-x-2 pt-3 border-t border-table-border">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditExpense(expense)
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-link hover:text-link-hover rounded-md hover:bg-button-secondary-hover transition-colors duration-200"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteExpense(expense.id)
                              }}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-800 rounded-md hover:bg-red-50 transition-colors duration-200"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {expenses.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-heading">No expenses yet</h3>
              <p className="mt-1 text-sm text-muted">
                Add your first shared expense to get started.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Balances Tab */}
      {activeTab === 'balances' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Current Balances */}
          <div>
            <h3 className="text-lg font-medium text-heading mb-4">Current Balances</h3>
            <div className="bg-card rounded-lg shadow-card overflow-hidden">
              <div className="divide-y divide-table-border">
                {balances.map((balance) => (
                  <div key={balance.userId} className="p-3 sm:p-4 flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs sm:text-sm font-medium mr-3 flex-shrink-0">
                        {balance.user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-heading truncate">
                          {balance.user.name}
                        </div>
                        <div className="text-xs sm:text-sm text-muted truncate">
                          {balance.user.email}
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm sm:text-lg font-semibold flex-shrink-0 ${
                      balance.balance > 0 
                        ? 'text-status-success' 
                        : balance.balance < 0 
                        ? 'text-status-error' 
                        : 'text-heading'
                    }`}>
                      {balance.balance > 0 ? '+' : ''}{formatAmount(Math.abs(balance.balance))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Suggested Settlements */}
          {suggestedSettlements.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-heading mb-4">Suggested Settlements</h3>
              <div className="space-y-3">
                {suggestedSettlements.map((settlement, index) => (
                  <div key={index} className="bg-status-info border border-blue-200 rounded-lg p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex items-center flex-wrap">
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium mr-2 flex-shrink-0">
                          {settlement.from.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm text-status-info truncate">
                          {settlement.from.name}
                        </span>
                        <span className="mx-2 text-status-info">owes</span>
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium mr-2 flex-shrink-0">
                          {settlement.to.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm text-status-info truncate">
                          {settlement.to.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-3">
                        <div className="text-base sm:text-lg font-semibold text-status-info">
                          {formatAmount(settlement.amount)}
                        </div>
                        {(settlement.from.id === session?.user?.id || settlement.to.id === session?.user?.id) && (
                          <button
                            onClick={() => initiateBalanceSettle(settlement.from.id, settlement.to.id, settlement.amount)}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 whitespace-nowrap"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Settle
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-8">
          {/* Overview Stats */}
          <div>
            <h3 className="text-lg font-medium text-heading mb-4">Group Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-card p-6 rounded-lg shadow-card">
                <div className="text-sm font-medium text-muted">Total Expenses</div>
                <div className="text-2xl font-semibold text-heading">{formatAmount(stats.totalAmount)}</div>
              </div>
              
              <div className="bg-card p-6 rounded-lg shadow-card">
                <div className="text-sm font-medium text-muted">Number of Expenses</div>
                <div className="text-2xl font-semibold text-heading">{stats.totalExpenses}</div>
              </div>
              
              <div className="bg-card p-6 rounded-lg shadow-card">
                <div className="text-sm font-medium text-muted">Average Expense</div>
                <div className="text-2xl font-semibold text-heading">{formatAmount(stats.averageExpense)}</div>
              </div>
              
              <div className="bg-card p-6 rounded-lg shadow-card">
                <div className="text-sm font-medium text-muted">Total Members</div>
                <div className="text-2xl font-semibold text-heading">{stats.totalMembers}</div>
              </div>
            </div>
          </div>

          {/* Member Statistics */}
          <div>
            <h3 className="text-lg font-medium text-heading mb-4">Member Statistics</h3>
            <div className="bg-card rounded-lg shadow-card overflow-hidden">
              <div className="divide-y divide-table-border">
                {stats.memberStats.map((member) => (
                  <div key={member.user.id} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium mr-3">
                          {member.user.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-heading">
                            {member.user.name}
                          </div>
                          <div className="text-sm text-muted">
                            {member.user.email}
                          </div>
                        </div>
                      </div>
                      <div className={`text-lg font-semibold ${
                        member.netBalance > 0 
                          ? 'text-status-success' 
                          : member.netBalance < 0 
                          ? 'text-status-error' 
                          : 'text-heading'
                      }`}>
                        {member.netBalance > 0 ? '+' : ''}{formatAmount(Math.abs(member.netBalance))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted">Total Lent</div>
                        <div className="font-medium text-status-success">{formatAmount(member.totalLent)}</div>
                      </div>
                      <div>
                        <div className="text-muted">Total Borrowed</div>
                        <div className="font-medium text-status-error">{formatAmount(member.totalBorrowed)}</div>
                      </div>
                      <div>
                        <div className="text-muted">Expenses Created</div>
                        <div className="font-medium text-heading">{member.totalExpenses}</div>
                      </div>
                      <div>
                        <div className="text-muted">Net Balance</div>
                        <div className={`font-medium ${
                          member.netBalance > 0 
                            ? 'text-status-success' 
                            : member.netBalance < 0 
                            ? 'text-status-error' 
                            : 'text-heading'
                        }`}>
                          {member.netBalance > 0 ? 'Owed ' : member.netBalance < 0 ? 'Owes ' : 'Even'}
                          {member.netBalance !== 0 && formatAmount(Math.abs(member.netBalance))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Contributors */}
          {(stats.topLender || stats.topBorrower) && (
            <div>
              <h3 className="text-lg font-medium text-heading mb-4">Top Contributors</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stats.topLender && (
                  <div className="bg-status-success border border-green-200 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center text-white text-lg font-medium mr-4">
                        {stats.topLender.user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-status-success">Top Lender</div>
                        <div className="text-lg font-semibold text-status-success">
                          {stats.topLender.user.name}
                        </div>
                        <div className="text-sm text-status-success">
                          Lent {formatAmount(stats.topLender.totalLent)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {stats.topBorrower && (
                  <div className="bg-status-info border border-blue-200 rounded-lg p-6">
                    <div className="flex items-center">
                      <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-medium mr-4">
                        {stats.topBorrower.user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-status-info">Most Active</div>
                        <div className="text-lg font-semibold text-status-info">
                          {stats.topBorrower.user.name}
                        </div>
                        <div className="text-sm text-status-info">
                          {stats.topBorrower.totalExpenses} expenses created
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settlements Tab */}
      {activeTab === 'settlements' && (
        <div className="space-y-4">
          {recordedSettlements.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted">No settlements recorded yet.</p>
            </div>
          ) : (
            recordedSettlements.map((settlement) => (
              <div key={settlement.id} className="bg-card rounded-lg shadow-card p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <DollarSign className="h-5 w-5 text-green-500 mr-2" />
                      <h3 className="text-lg font-medium text-heading">
                        Settlement: {formatAmount(settlement.amount)}
                      </h3>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-muted">
                        <span className="font-medium">{settlement.borrower.name || settlement.borrower.email}</span>
                        {' paid '}
                        <span className="font-medium">{settlement.lender.name || settlement.lender.email}</span>
                      </p>
                      <p className="text-xs text-muted">
                        Settled on {new Date(settlement.settledAt).toLocaleDateString()}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-muted">Paid from:</span>
                          <div className="flex items-center justify-between">
                            <span className="text-heading">
                              {settlement.borrowerAccount?.name || 'Others'}
                            </span>
                            {session?.user?.id === settlement.borrowerUserId && (
                              <button
                                onClick={() => {
                                  setEditingSettlement({...settlement, type: 'borrower'})
                                  setShowEditSettlement(true)
                                }}
                                className="text-link hover:text-link-hover"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-muted">Received in:</span>
                          <div className="flex items-center justify-between">
                            <span className="text-heading">
                              {settlement.lenderAccount?.name || 'Others'}
                            </span>
                            {session?.user?.id === settlement.lenderUserId && (
                              <button
                                onClick={() => {
                                  setEditingSettlement({...settlement, type: 'lender'})
                                  setShowEditSettlement(true)
                                }}
                                className="text-link hover:text-link-hover"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-card-border pt-4 flex items-center justify-end">
                    {(session?.user?.id === settlement.borrowerUserId || session?.user?.id === settlement.lenderUserId) && (
                      <button
                        onClick={() => handleDeleteSettlement(settlement.id)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Settlement
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Activity Log Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted">No activities recorded yet.</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="bg-card rounded-lg shadow-card p-4">
                <div className="flex items-start space-x-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                    {activity.user.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-heading">
                      {formatActivityDescription(activity)}
                    </div>
                    <div className="text-xs text-muted mt-1">
                      {new Date(activity.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-modal-overlay overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-heading mb-4">
                Add New Expense
              </h3>
              <form onSubmit={handleAddExpense} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={newExpense.description}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                    placeholder="e.g., Dinner at restaurant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Account (Optional)
                  </label>
                  <select
                    value={newExpense.accountId}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, accountId: e.target.value }))}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200 appearance-none bg-arrow-down bg-no-repeat bg-right bg-origin-content"
                  >
                    <option value="">Select Account</option>
                    <optgroup label="Accounts">
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.type})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Others">
                      <option value="">Others (Miscellaneous)</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Split Type
                  </label>
                  <select
                    value={newExpense.splitType}
                    onChange={(e) => {
                      setNewExpense(prev => ({ ...prev, splitType: e.target.value }))
                      setTimeout(initializeSplits, 100) // Initialize splits after state update
                    }}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200 appearance-none bg-arrow-down bg-no-repeat bg-right bg-origin-content"
                  >
                    <option value="EQUAL">Equal Split</option>
                    <option value="CUSTOM">Custom Amounts</option>
                  </select>
                </div>

                {/* Lender Selection */}
                {newExpense.lenders.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-input-label mb-2">
                      Select Who Paid (Lenders) *
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-input rounded p-2">
                      {newExpense.lenders.map((lender) => {
                        const member = group?.members.find(m => m.user.id === lender.userId)
                        if (!member) return null
                        
                        const selectedLenders = newExpense.lenders.filter(l => l.selected)
                        const showAmountInput = selectedLenders.length > 1
                        
                        return (
                          <div key={lender.userId} className="flex items-center space-x-3 p-2 border border-card-border rounded">
                            <input
                              type="checkbox"
                              checked={lender.selected}
                              onChange={(e) => updateLenderSelection(lender.userId, e.target.checked)}
                              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-input rounded transition-all duration-200"
                            />
                            <div className="flex-1 flex items-center">
                              <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium mr-3">
                                {member.user.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-heading">
                                  {member.user.name}
                                </div>
                                <div className="text-xs text-muted">
                                  {member.user.email}
                                </div>
                              </div>
                            </div>
                            {lender.selected && (
                              <div className="flex space-x-2">
                                {showAmountInput && (
                                  <div className="w-24">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={lender.amount || ''}
                                      onChange={(e) => updateLenderAmount(lender.userId, parseFloat(e.target.value) || 0)}
                                      className="w-full px-3 py-2 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-sm bg-input text-input placeholder-gray-400 transition-all duration-200"
                                      placeholder="0.00"
                                    />
                                  </div>
                                )}
                                <div className="w-36">
                                  <select
                                    value={lender.accountId}
                                    onChange={(e) => updateLenderAccount(lender.userId, e.target.value)}
                                    className="w-full px-3 py-2 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-sm bg-input text-input transition-all duration-200 appearance-none bg-arrow-down bg-no-repeat bg-right bg-origin-content"
                                  >
                                    <option value="">Others</option>
                                    {accounts.map((account) => (
                                      <option key={account.id} value={account.id}>
                                        {account.name}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {newExpense.lenders.filter(l => l.selected).length > 1 && (
                      <div className="mt-2 text-sm text-muted">
                        Total: {formatAmount(newExpense.lenders.reduce((sum, lender) => sum + (lender.selected ? lender.amount : 0), 0))} 
                        / {formatAmount(parseFloat(newExpense.amount) || 0)}
                      </div>
                    )}
                  </div>
                )}

                {/* Member Selection and Split Configuration */}
                {newExpense.splits.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-input-label mb-2">
                      Select Members and {newExpense.splitType === 'CUSTOM' ? 'Amounts' : 'Split'}
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {newExpense.splits.map((split, index) => {
                        const member = group?.members.find(m => m.user.id === split.userId)
                        if (!member) return null
                        
                        return (
                          <div key={split.userId} className="flex items-center space-x-3 p-2 border border-input rounded">
                            <input
                              type="checkbox"
                              checked={split.selected}
                              onChange={(e) => updateSplitSelection(split.userId, e.target.checked)}
                              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-input rounded transition-all duration-200"
                            />
                            <div className="flex-1 flex items-center">
                              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium mr-3">
                                {member.user.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-heading">
                                  {member.user.name}
                                </div>
                                <div className="text-xs text-muted">
                                  {member.user.email}
                                </div>
                              </div>
                            </div>
                            {newExpense.splitType === 'CUSTOM' && split.selected && (
                              <div className="w-28">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={split.amount || ''}
                                  onChange={(e) => updateSplitAmount(split.userId, parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-sm bg-input text-input placeholder-gray-400 transition-all duration-200"
                                  placeholder="0.00"
                                />
                              </div>
                            )}
                            {newExpense.splitType === 'EQUAL' && split.selected && (
                              <div className="text-sm text-muted">
                                {newExpense.amount ? formatAmount(parseFloat(newExpense.amount) / newExpense.splits.filter(s => s.selected).length) : formatAmount(0)}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    {newExpense.splitType === 'CUSTOM' && (
                      <div className="mt-2 text-sm text-muted">
                        Total: {formatAmount(newExpense.splits.reduce((sum, split) => sum + (split.selected ? split.amount : 0), 0))} 
                        / {formatAmount(parseFloat(newExpense.amount) || 0)}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="bg-input py-3 px-6 border border-input rounded-lg shadow-sm text-base font-medium text-input-label hover:bg-button-secondary-hover transition-all duration-200 text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addExpenseLoading}
                    className="bg-blue-600 border border-transparent rounded-lg shadow-sm py-3 px-6 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 flex items-center justify-center min-w-[140px]"
                  >
                    {addExpenseLoading ? <LoadingSpinner size="sm" /> : 'Add Expense'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditExpense && editingExpense && (
        <div className="fixed inset-0 bg-modal-overlay overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-heading mb-4">
                Edit Group Expense
              </h3>
              <EditExpenseForm 
                expense={editingExpense}
                group={group}
                accounts={accounts}
                onSave={() => {
                  setShowEditExpense(false)
                  setEditingExpense(null)
                  fetchExpenses()
                  fetchBalances()
                  fetchStats()
                }}
                onCancel={() => {
                  setShowEditExpense(false)
                  setEditingExpense(null)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettleModal && (
        <div className="fixed inset-0 bg-modal-overlay overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-heading mb-4">
                {settleData.isLender ? 'Record Settlement Receipt' : 'Record Settlement Payment'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-input-label mb-1">
                    {settleData.isLender ? 'Account that received the payment' : 'Account used for payment'} (Optional)
                  </label>
                  <select
                    value={settlementAccountId}
                    onChange={(e) => setSettlementAccountId(e.target.value)}
                    className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
                  >
                    <option value="">Others (Miscellaneous)</option>
                    <optgroup label="Accounts">
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.type})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                
                <div className="text-sm text-muted">
                  {settleData.isLender 
                    ? 'Mark these debts as settled and optionally record which account received the payments.'
                    : 'Mark your debt as settled and optionally record which account you used for payment.'
                  }
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="px-4 py-2 text-input-label border border-input rounded-md hover:bg-button-secondary-hover"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSettleDebt}
                  disabled={settleDebtLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {settleDebtLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2 inline" />
                      Mark as Settled
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Settlement Modal */}
      {showEditSettlement && editingSettlement && (
        <div className="fixed inset-0 bg-modal-overlay overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-heading mb-4">
                Update {editingSettlement.type === 'borrower' ? 'Payment' : 'Receipt'} Account
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-input-label mb-1">
                    {editingSettlement.type === 'borrower' ? 'Account used for payment' : 'Account that received the payment'}
                  </label>
                  <select
                    value={editingSettlement.type === 'borrower' 
                      ? editingSettlement.borrowerAccountId || '' 
                      : editingSettlement.lenderAccountId || ''}
                    onChange={(e) => {
                      const accountId = e.target.value
                      handleUpdateSettlement(editingSettlement.id, accountId, editingSettlement.type)
                    }}
                    className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
                  >
                    <option value="">Others</option>
                    <optgroup label="Accounts">
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.type})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                
                <div className="text-sm text-muted">
                  Settlement: {formatAmount(editingSettlement.amount)} between{' '}
                  <span className="font-medium">{editingSettlement.borrower.name || editingSettlement.borrower.email}</span>
                  {' and '}
                  <span className="font-medium">{editingSettlement.lender.name || editingSettlement.lender.email}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSettlement(false)
                    setEditingSettlement(null)
                  }}
                  className="px-4 py-2 text-input-label border border-input rounded-md hover:bg-button-secondary-hover"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal && (
        <AlertModal
          isOpen={alertModal?.isOpen || false}
          onClose={closeAlert}
          title={alertModal?.title || ''}
          message={alertModal?.message || ''}
          type={alertModal?.type || 'info'}
          confirmText={alertModal.confirmText}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
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
      )}
    </div>
  )
}

// Edit Expense Form Component
function EditExpenseForm({ 
  expense, 
  group, 
  accounts, 
  onSave, 
  onCancel 
}: {
  expense: GroupExpense
  group: Group | null
  accounts: Account[]
  onSave: () => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    description: expense.description,
    amount: expense.amount.toString(),
    date: expense.date.split('T')[0], // Convert to YYYY-MM-DD format
    splitType: expense.splitType,
    splits: expense.splits.map(split => ({
      userId: split.user.id,
      amount: split.amount,
      selected: true
    })),
    lenders: expense.lenders.map(lender => ({
      userId: lender.user.id,
      amount: lender.amount,
      accountId: lender.account?.id || '',
      selected: true
    }))
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch(`/api/groups/${group?.id}/expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSave()
      } else {
        const error = await response.json()
        showAlert({
          title: 'Update Failed',
          message: error.error || 'Failed to update expense',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error updating expense:', error)
      showAlert({
        title: 'Update Failed',
        message: 'Failed to update expense',
        type: 'error'
      })
    }
  }

  const updateSplitAmount = (userId: string, amount: number) => {
    setFormData(prev => ({
      ...prev,
      splits: prev.splits.map(split =>
        split.userId === userId ? { ...split, amount } : split
      )
    }))
  }

  const updateLenderAmount = (userId: string, amount: number) => {
    setFormData(prev => ({
      ...prev,
      lenders: prev.lenders.map(lender =>
        lender.userId === userId ? { ...lender, amount } : lender
      )
    }))
  }

  const updateLenderAccount = (userId: string, accountId: string) => {
    setFormData(prev => ({
      ...prev,
      lenders: prev.lenders.map(lender =>
        lender.userId === userId ? { ...lender, accountId } : lender
      )
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-input-label mb-1">
            Description *
          </label>
          <input
            type="text"
            required
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-input-label mb-1">
            Amount *
          </label>
          <input
            type="number"
            step="0.01"
            required
            value={formData.amount}
            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-input-label mb-1">
          Date
        </label>
        <input
          type="date"
          value={formData.date}
          onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
          className="w-full border border-input rounded-md px-3 py-2 bg-input text-heading"
        />
      </div>

      {/* Lenders Section */}
      <div>
        <label className="block text-sm font-medium text-input-label mb-2">
          Lenders
        </label>
        <div className="space-y-2 max-h-32 overflow-y-auto border border-input rounded p-2">
          {formData.lenders.map((lender) => {
            const member = group?.members.find(m => m.user.id === lender.userId)
            if (!member) return null
            
            return (
              <div key={lender.userId} className="flex items-center space-x-2">
                <span className="text-sm w-20">{member.user.name}</span>
                <input
                  type="number"
                  step="0.01"
                  value={lender.amount}
                  onChange={(e) => updateLenderAmount(lender.userId, parseFloat(e.target.value) || 0)}
                  className="w-24 border border-input rounded px-2 py-1 text-xs bg-input text-heading"
                />
                <select
                  value={lender.accountId}
                  onChange={(e) => updateLenderAccount(lender.userId, e.target.value)}
                  className="flex-1 border border-input rounded px-2 py-1 text-xs bg-input text-heading"
                >
                  <option value="">Others (Miscellaneous)</option>
                  {accounts
                    .filter(account => !['OTHERS_FIXED', 'GROUP_LENDING'].includes(account.type))
                    .map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                </select>
              </div>
            )
          })}
        </div>
      </div>

      {/* Splits Section */}
      <div>
        <label className="block text-sm font-medium text-input-label mb-2">
          Split Among
        </label>
        <div className="space-y-2 max-h-32 overflow-y-auto border border-input rounded p-2">
          {formData.splits.map((split) => {
            const member = group?.members.find(m => m.user.id === split.userId)
            if (!member) return null
            
            return (
              <div key={split.userId} className="flex items-center space-x-2">
                <span className="text-sm w-20">{member.user.name}</span>
                <input
                  type="number"
                  step="0.01"
                  value={split.amount}
                  onChange={(e) => updateSplitAmount(split.userId, parseFloat(e.target.value) || 0)}
                  className="w-24 border border-input rounded px-2 py-1 text-xs bg-input text-heading"
                />
              </div>
            )
          })}
        </div>
      </div>

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
          Update Expense
        </button>
      </div>
    </form>
  )
}