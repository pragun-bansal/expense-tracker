'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { PlusCircle, Calendar, Play, Pause, Edit, Trash2, RefreshCw } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts'
import { useCurrency } from '@/hooks/useCurrency'
import { useModal } from '@/hooks/useModal'
import AlertModal from '@/components/AlertModal'
import ConfirmModal from '@/components/ConfirmModal'

interface RecurringExpense {
  id: string
  amount: number
  description: string
  frequency: string
  startDate: string
  endDate?: string
  nextDueDate: string
  isActive: boolean
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
  expenses: Array<{
    id: string
    amount: number
    date: string
  }>
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
  balance: number
}

export default function RecurringExpenses() {
  const { data: session } = useSession()
  const { handleBudgetAlert } = useBudgetAlerts()
  const { formatAmount } = useCurrency()
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal()
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null)
  const [processing, setProcessing] = useState(false)
  const [processingIndividual, setProcessingIndividual] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    frequency: 'MONTHLY',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    categoryId: '',
    accountId: ''
  })

  useEffect(() => {
    if (session) {
      fetchRecurringExpenses()
      fetchCategories()
      fetchAccounts()
    }
  }, [session])

  const fetchRecurringExpenses = async () => {
    try {
      const response = await fetch('/api/recurring-expenses')
      if (response.ok) {
        const data = await response.json()
        // Sort by start date (earliest first) and ensure expenses array exists
        const sortedData = data.map((expense: RecurringExpense) => ({
          ...expense,
          expenses: expense.expenses || [] // Ensure expenses array exists
        })).sort((a: RecurringExpense, b: RecurringExpense) => 
          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        )
        setRecurringExpenses(sortedData)
      }
    } catch (error) {
      console.error('Error fetching recurring expenses:', error)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch('/api/recurring-expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const newRecurringExpense = await response.json()
        fetchRecurringExpenses() // Refetch to maintain sorting
        setShowAddForm(false)
        resetForm()
      } else {
        const error = await response.json()
        showAlert({
          title: 'Creation Failed',
          message: error.error || 'Failed to create recurring expense',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error creating recurring expense:', error)
      showAlert({
        title: 'Creation Failed',
        message: 'Something went wrong',
        type: 'error'
      })
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return

    try {
      const response = await fetch(`/api/recurring-expenses/${editingExpense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        fetchRecurringExpenses() // Refetch to maintain sorting
        setShowEditForm(false)
        setEditingExpense(null)
        resetForm()
      } else {
        const error = await response.json()
        showAlert({
          title: 'Update Failed',
          message: error.error || 'Failed to update recurring expense',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error updating recurring expense:', error)
      showAlert({
        title: 'Update Failed',
        message: 'Something went wrong',
        type: 'error'
      })
    } finally {
      setUpdateLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      frequency: 'MONTHLY',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      categoryId: '',
      accountId: ''
    })
  }

  const handleEdit = (expense: RecurringExpense) => {
    setEditingExpense(expense)
    setFormData({
      amount: expense.amount.toString(),
      description: expense.description || '',
      frequency: expense.frequency,
      startDate: expense.startDate.split('T')[0],
      endDate: expense.endDate ? expense.endDate.split('T')[0] : '',
      categoryId: expense.category.id,
      accountId: expense.account.id
    })
    setShowEditForm(true)
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/recurring-expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (response.ok) {
        setRecurringExpenses(recurringExpenses.map(expense => 
          expense.id === id ? { ...expense, isActive: !currentStatus } : expense
        ))
      }
    } catch (error) {
      console.error('Error updating recurring expense:', error)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm({
      title: 'Delete Recurring Expense',
      message: 'Are you sure you want to delete this recurring expense?',
      type: 'danger'
    })
    if (!confirmed) {
      closeConfirm()
      return
    }

    try {
      const response = await fetch(`/api/recurring-expenses/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        closeConfirm()
        setRecurringExpenses(recurringExpenses.filter(expense => expense.id !== id))
      } else {
        closeConfirm()
        showAlert({
          title: 'Delete Failed',
          message: 'Failed to delete recurring expense',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error deleting recurring expense:', error)
      closeConfirm()
      showAlert({
        title: 'Delete Failed',
        message: 'Failed to delete recurring expense',
        type: 'error'
      })
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleProcessRecurring = async () => {
    setProcessing(true)
    try {
      const response = await fetch('/api/recurring-expenses/process', {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        showAlert({
          title: 'Processing Complete',
          message: result.message,
          type: 'success'
        })
        fetchRecurringExpenses()
      } else {
        showAlert({
          title: 'Processing Failed',
          message: 'Failed to process recurring expenses',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error processing recurring expenses:', error)
      showAlert({
        title: 'Processing Failed',
        message: 'Failed to process recurring expenses',
        type: 'error'
      })
    } finally {
      setProcessing(false)
    }
  }

  const handleProcessIndividual = async (id: string) => {
    setProcessingIndividual(id)
    try {
      const response = await fetch(`/api/recurring-expenses/${id}/process`, {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        
        // Handle budget alerts if present
        if (result.budgetAlert) {
          handleBudgetAlert(result.budgetAlert)
        }
        
        showAlert({
          title: 'Processing Complete',
          message: result.message,
          type: 'success'
        })
        fetchRecurringExpenses()
      } else {
        const error = await response.json()
        showAlert({
          title: 'Processing Failed',
          message: error.error || 'Failed to process recurring expense',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error processing recurring expense:', error)
      showAlert({
        title: 'Processing Failed',
        message: 'Failed to process recurring expense',
        type: 'error'
      })
    } finally {
      setProcessingIndividual(null)
    }
  }

  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case 'DAILY': return 'Daily'
      case 'WEEKLY': return 'Weekly'
      case 'MONTHLY': return 'Monthly'
      case 'YEARLY': return 'Yearly'
      default: return frequency
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const isDue = (nextDueDate: string) => {
    return new Date(nextDueDate) <= new Date()
  }

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-heading">Recurring Expenses</h1>
          <p className="mt-2 text-sm text-body">
            Automate your regular expenses
          </p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <button
            onClick={handleProcessRecurring}
            disabled={processing}
            className="inline-flex items-center justify-center px-4 py-2 border border-input text-sm font-medium rounded-md text-input-label bg-card hover:bg-button-secondary-hover disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${processing ? 'animate-spin' : ''}`} />
            {processing ? 'Processing...' : 'Process Due'}
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Recurring Expense
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || showEditForm) && (
        <div className="bg-card shadow-card rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-heading mb-4">
              {showEditForm ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
            </h3>
            <form onSubmit={showEditForm ? handleEditSubmit : handleSubmit} className="space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-input-label mb-3">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="amount"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-input-label mb-3">
                    Frequency *
                  </label>
                  <select
                    id="frequency"
                    value={formData.frequency}
                    onChange={(e) => setFormData({...formData, frequency: e.target.value})}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200 appearance-none bg-arrow-down bg-no-repeat bg-right bg-origin-content"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="categoryId" className="block text-sm font-medium text-input-label mb-3">
                    Category *
                  </label>
                  <select
                    id="categoryId"
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
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
                    id="accountId"
                    required
                    value={formData.accountId}
                    onChange={(e) => setFormData({...formData, accountId: e.target.value})}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200 appearance-none bg-arrow-down bg-no-repeat bg-right bg-origin-content"
                  >
                    <option value="">Select an account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-input-label mb-3">
                  Description
                </label>
                <input
                  type="text"
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                  placeholder="Description of the recurring expense"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-input-label mb-3">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-input-label mb-3">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setShowEditForm(false)
                    setEditingExpense(null)
                    resetForm()
                  }}
                  className="bg-input py-3 px-6 border border-input rounded-lg shadow-sm text-sm sm:text-base font-medium text-input-label hover:bg-button-secondary-hover transition-all duration-200 text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 border border-transparent rounded-lg shadow-sm py-3 px-6 text-sm sm:text-base font-medium text-white hover:bg-blue-700 transition-all duration-200"
                >
                  {showEditForm ? 'Update Recurring Expense' : 'Add Recurring Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recurring Expenses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recurringExpenses.map((expense) => (
          <div key={expense.id} className="bg-card overflow-hidden shadow-card rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: (expense.category?.color || '#6B7280') + '20' }}
                  >
                    <Calendar
                      className="h-6 w-6"
                      style={{ color: expense.category?.color || '#6B7280' }}
                    />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-heading">
                      {formatAmount(expense.amount)}
                    </h3>
                    <p className="text-sm text-muted">
                      {formatFrequency(expense.frequency)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleProcessIndividual(expense.id)}
                    disabled={processingIndividual === expense.id}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-full disabled:opacity-50"
                    title="Process this recurring expense now"
                  >
                    <RefreshCw className={`h-4 w-4 ${processingIndividual === expense.id ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleEdit(expense)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"
                    title="Edit recurring expense"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(expense.id, expense.isActive)}
                    className={`p-2 rounded-full ${expense.isActive ? 'text-green-600 hover:bg-status-success' : 'text-gray-400 hover:bg-button-secondary-hover'}`}
                    title={expense.isActive ? 'Pause recurring expense' : 'Resume recurring expense'}
                  >
                    {!expense.isActive ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="p-2 text-red-600 hover:bg-status-error rounded-full"
                    title="Delete recurring expense"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4">
                <div className="text-sm text-heading">
                  {expense.description || 'No description'}
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted">
                    Category: {expense.category.name}
                  </span>
                  <span className="text-muted">
                    Account: {expense.account.name}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted">
                    Next Due: {formatDate(expense.nextDueDate)}
                  </span>
                  {isDue(expense.nextDueDate) && expense.isActive && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-error text-status-error">
                      Due
                    </span>
                  )}
                </div>
                {expense.expenses && expense.expenses.length > 0 && (
                  <div className="mt-2 text-sm text-muted">
                    Last processed: {formatDate(expense.expenses[0].date)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {recurringExpenses.length === 0 && !showAddForm && (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-heading">No recurring expenses</h3>
          <p className="mt-1 text-sm text-muted">
            Get started by creating your first recurring expense.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Recurring Expense
            </button>
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