'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, DollarSign, Users, Receipt, Check, X, Trash2 } from 'lucide-react'

interface GroupExpense {
  id: string
  description: string
  amount: number
  date: string
  splitType: string
  receiptUrl?: string
  paidBy: {
    id: string
    name: string
    email: string
  }
  splits: Array<{
    id: string
    amount: number
    settled: boolean
    user: {
      id: string
      name: string
      email: string
    }
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

export default function GroupDetail({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [group, setGroup] = useState<Group | null>(null)
  const [expenses, setExpenses] = useState<GroupExpense[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses')

  const [newExpense, setNewExpense] = useState({
    description: '',
    amount: '',
    splitType: 'EQUAL',
    splits: [] as Array<{ userId: string; amount: number; selected: boolean }>
  })

  useEffect(() => {
    if (session) {
      fetchGroup()
      fetchExpenses()
      fetchBalances()
    }
  }, [session])

  const fetchGroup = async () => {
    try {
      const response = await fetch(`/api/groups/${params.id}`)
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
      const response = await fetch(`/api/groups/${params.id}/expenses`)
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
      const response = await fetch(`/api/groups/${params.id}/balances`)
      if (response.ok) {
        const data = await response.json()
        setBalances(data.balances)
        setSettlements(data.settlements)
      }
    } catch (error) {
      console.error('Error fetching balances:', error)
    }
  }

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group) return

    try {
      let splits = newExpense.splits
      
      if (newExpense.splitType === 'EQUAL') {
        // Equal split among selected members
        const selectedMembers = newExpense.splits.filter(split => split.selected)
        if (selectedMembers.length === 0) {
          alert('Please select at least one member for the split')
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
          alert('Please select members and specify amounts for custom split')
          return
        }
        
        const totalSplitAmount = selectedSplits.reduce((sum, split) => sum + split.amount, 0)
        if (Math.abs(totalSplitAmount - parseFloat(newExpense.amount)) > 0.01) {
          alert('Split amounts must equal the total expense amount')
          return
        }
        
        splits = selectedSplits
      }

      const response = await fetch(`/api/groups/${params.id}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: newExpense.description,
          amount: parseFloat(newExpense.amount),
          splitType: newExpense.splitType,
          splits: splits.map(split => ({
            userId: split.userId,
            amount: split.amount
          }))
        })
      })

      if (response.ok) {
        setShowAddExpense(false)
        setNewExpense({
          description: '',
          amount: '',
          splitType: 'EQUAL',
          splits: []
        })
        fetchExpenses()
        fetchBalances()
      }
    } catch (error) {
      console.error('Error adding expense:', error)
    }
  }

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return

    try {
      const response = await fetch(`/api/groups/${params.id}/expenses/${expenseId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchExpenses()
        fetchBalances()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete expense')
      }
    } catch (error) {
      console.error('Error deleting expense:', error)
    }
  }

  const initializeSplits = () => {
    if (!group) return
    
    const splits = group.members.map(member => ({
      userId: member.user.id,
      amount: 0,
      selected: newExpense.splitType === 'EQUAL'
    }))
    
    setNewExpense(prev => ({ ...prev, splits }))
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

  const handleSettleDebt = async (splitIds: string[]) => {
    try {
      const response = await fetch(`/api/groups/${params.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ splitIds })
      })

      if (response.ok) {
        fetchExpenses()
        fetchBalances()
      }
    } catch (error) {
      console.error('Error settling debt:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading group...</div>
      </div>
    )
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
    <div>
      <div className="mb-8">
        <Link
          href="/groups"
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Groups
        </Link>
      </div>

      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
          {group.description && (
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {group.description}
            </p>
          )}
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {group.members.length} members
              </span>
            </div>
            <div className="flex -space-x-2">
              {group.members.map((member) => (
                <div
                  key={member.id}
                  className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium border-2 border-white dark:border-gray-900"
                  title={member.user.name}
                >
                  {member.user.name?.[0]?.toUpperCase() || 'U'}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={() => {
              setShowAddExpense(true)
              setTimeout(initializeSplits, 100)
            }}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'expenses'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'balances'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Balances
          </button>
        </nav>
      </div>

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {expenses.map((expense) => {
            const myShare = expense.splits.find(split => split.user.id === session?.user?.id)
            const isPaidByMe = expense.paidBy.id === session?.user?.id

            return (
              <div key={expense.id} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/20 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Receipt className="h-5 w-5 text-gray-400 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {expense.description}
                      </h3>
                    </div>
                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>Paid by {expense.paidBy.name}</span>
                      <span>•</span>
                      <span>{new Date(expense.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{expense.splitType.toLowerCase()} split</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${expense.amount.toFixed(2)}
                    </div>
                    {myShare && (
                      <div className={`text-sm ${myShare.settled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        Your share: ${myShare.amount.toFixed(2)}
                        {myShare.settled ? ' (settled)' : ' (unsettled)'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Split details */}
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Split Details</h4>
                  <div className="space-y-2">
                    {expense.splits.map((split) => (
                      <div key={split.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium mr-3">
                            {split.user.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-sm text-gray-900 dark:text-white">
                            {split.user.name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-900 dark:text-white">
                            ${split.amount.toFixed(2)}
                          </span>
                          {split.settled ? (
                            <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4 flex items-center justify-between">
                  <div>
                    {myShare && !myShare.settled && !isPaidByMe && (
                      <button
                        onClick={() => handleSettleDebt([myShare.id])}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Mark as Settled
                      </button>
                    )}
                  </div>
                  
                  {/* Delete button - only for admins or the person who paid */}
                  {(group?.members.find(m => m.user.id === session?.user?.id)?.role === 'ADMIN' || isPaidByMe) && (
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {expenses.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No expenses yet</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add your first shared expense to get started.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Balances Tab */}
      {activeTab === 'balances' && (
        <div className="space-y-8">
          {/* Current Balances */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Current Balances</h3>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/20 overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {balances.map((balance) => (
                  <div key={balance.userId} className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium mr-3">
                        {balance.user.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {balance.user.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {balance.user.email}
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-semibold ${
                      balance.balance > 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : balance.balance < 0 
                        ? 'text-red-600 dark:text-red-400' 
                        : 'text-gray-900 dark:text-white'
                    }`}>
                      {balance.balance > 0 ? '+' : ''}${balance.balance.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Suggested Settlements */}
          {settlements.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Suggested Settlements</h3>
              <div className="space-y-3">
                {settlements.map((settlement, index) => (
                  <div key={index} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium mr-3">
                          {settlement.from.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm text-blue-900 dark:text-blue-200">
                          {settlement.from.name}
                        </span>
                        <span className="mx-2 text-blue-600 dark:text-blue-400">owes</span>
                        <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-medium mr-3">
                          {settlement.to.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm text-blue-900 dark:text-blue-200">
                          {settlement.to.name}
                        </span>
                      </div>
                      <div className="text-lg font-semibold text-blue-900 dark:text-blue-200">
                        ${settlement.amount.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Expense Modal */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Add New Expense
              </h3>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={newExpense.description}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Dinner at restaurant"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Split Type
                  </label>
                  <select
                    value={newExpense.splitType}
                    onChange={(e) => {
                      setNewExpense(prev => ({ ...prev, splitType: e.target.value }))
                      setTimeout(initializeSplits, 100) // Initialize splits after state update
                    }}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="EQUAL">Equal Split</option>
                    <option value="CUSTOM">Custom Amounts</option>
                  </select>
                </div>

                {/* Member Selection and Split Configuration */}
                {newExpense.splits.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Members and {newExpense.splitType === 'CUSTOM' ? 'Amounts' : 'Split'}
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {newExpense.splits.map((split, index) => {
                        const member = group?.members.find(m => m.user.id === split.userId)
                        if (!member) return null
                        
                        return (
                          <div key={split.userId} className="flex items-center space-x-3 p-2 border border-gray-200 dark:border-gray-600 rounded">
                            <input
                              type="checkbox"
                              checked={split.selected}
                              onChange={(e) => updateSplitSelection(split.userId, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1 flex items-center">
                              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium mr-3">
                                {member.user.name?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <div className="flex-1">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {member.user.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {member.user.email}
                                </div>
                              </div>
                            </div>
                            {newExpense.splitType === 'CUSTOM' && split.selected && (
                              <div className="w-24">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={split.amount || ''}
                                  onChange={(e) => updateSplitAmount(split.userId, parseFloat(e.target.value) || 0)}
                                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  placeholder="0.00"
                                />
                              </div>
                            )}
                            {newExpense.splitType === 'EQUAL' && split.selected && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                ${newExpense.amount ? (parseFloat(newExpense.amount) / newExpense.splits.filter(s => s.selected).length).toFixed(2) : '0.00'}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    {newExpense.splitType === 'CUSTOM' && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Total: ${newExpense.splits.reduce((sum, split) => sum + (split.selected ? split.amount : 0), 0).toFixed(2)} 
                        / ${newExpense.amount || '0.00'}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Expense
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}