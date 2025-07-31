'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Plus, Edit3, Target, Trash2, Palette, DollarSign, Coffee, ShoppingCart, Home, Car, Fuel, Music, Smartphone, CreditCard, TrendingUp, Briefcase, Building, Plane, Book, Heart, Gift, Settings, Package, RefreshCw } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useCurrency } from '@/hooks/useCurrency'
import AlertModal from '@/components/AlertModal'
import ConfirmModal from '@/components/ConfirmModal'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useModal } from '@/hooks/useModal'

interface Category {
  id: string
  name: string
  type: 'EXPENSE' | 'INCOME'
  color: string
  icon: string
  budget?: {
    id: string
    amount: number
    period: 'MONTHLY' | 'YEARLY'
    currentSpent: number
  }
}

interface Budget {
  id: string
  categoryId: string
  amount: number
  period: 'MONTHLY' | 'YEARLY'
  currentSpent: number
}

export default function BudgetsAndCategories() {
  const { data: session } = useSession()
  const { formatAmount } = useCurrency()
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [updateLoading, setUpdateLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [budgetCategory, setBudgetCategory] = useState<Category | null>(null)

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#4ECDC4',
    icon: 'Package'
  })

  const [budgetForm, setBudgetForm] = useState({
    amount: '',
    period: 'MONTHLY' as 'MONTHLY' | 'YEARLY'
  })

  useEffect(() => {
    if (session) {
      fetchCategories()
    }
  }, [session])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const [categoriesResponse, budgetsResponse] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/budgets')
      ])

      if (categoriesResponse.ok && budgetsResponse.ok) {
        const categoriesData = await categoriesResponse.json()
        const budgetsData = await budgetsResponse.json()

        console.log('Budget data received:', budgetsData)

        // Combine categories with their budgets
        const categoriesWithBudgets = categoriesData.map((category: any) => {
          // Don't attach budgets to system categories or income categories
          const isSystemCat = category.name.toLowerCase() === 'others'
          const isIncomeCat = category.type === 'INCOME'
          
          if (isSystemCat || isIncomeCat) {
            return { ...category, budget: undefined }
          }

          const budget = budgetsData.find((b: any) => b.categoryId === category.id)
          if (budget) {
            console.log(`Budget for ${category.name}:`, {
              amount: budget.amount,
              currentSpending: budget.currentSpending,
              percentUsed: budget.percentUsed
            })
          }
          
          return {
            ...category,
            budget: budget ? {
              id: budget.id,
              amount: budget.amount,
              period: budget.period,
              currentSpent: budget.currentSpending || 0
            } : undefined
          }
        })

        setCategories(categoriesWithBudgets)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async () => {
    setCreateLoading(true)
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...categoryForm,
          type: activeTab.toUpperCase()
        })
      })

      if (response.ok) {
        setShowCategoryModal(false)
        setCategoryForm({ name: '', color: '#4ECDC4', icon: 'Package' })
        fetchCategories()
      } else {
        const error = await response.json()
        showAlert({
          title: 'Error',
          message: error.error || 'Failed to create category',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error creating category:', error)
      showAlert({
        title: 'Error',
        message: 'Failed to create category',
        type: 'error'
      })
    } finally {
      setCreateLoading(false)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return

    setUpdateLoading(true)
    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm)
      })

      if (response.ok) {
        setShowCategoryModal(false)
        setEditingCategory(null)
        setCategoryForm({ name: '', color: '#4ECDC4', icon: 'Package' })
        fetchCategories()
      } else {
        const error = await response.json()
        showAlert({
          title: 'Error',
          message: error.error || 'Failed to update category',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error updating category:', error)
      showAlert({
        title: 'Error',
        message: 'Failed to update category',
        type: 'error'
      })
    } finally {
      setUpdateLoading(false)
    }
  }

  const handleDeleteCategory = async (category: Category) => {
    // Prevent deletion of system categories
    if (category.name.toLowerCase() === 'others') {
      showAlert({
        title: 'Cannot Delete',
        message: 'System categories cannot be deleted.',
        type: 'warning'
      })
      return
    }

    const confirmed = await showConfirm({
      title: 'Delete Category',
      message: `Are you sure you want to delete "${category.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger'
    })
    
    if (!confirmed) {
      closeConfirm()
      return
    }

    setDeleteLoading(true)
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchCategories()
      } else {
        const error = await response.json()
        showAlert({
          title: 'Error',
          message: error.error || 'Failed to delete category',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error deleting category:', error)
      showAlert({
        title: 'Error',
        message: 'Failed to delete category',
        type: 'error'
      })
    } finally {
      setDeleteLoading(false)
    }
    
    closeConfirm()
  }

  const handleSetBudget = async () => {
    if (!budgetCategory) return

    setBudgetLoading(true)
    try {
      const method = budgetCategory.budget ? 'PUT' : 'POST'
      const url = budgetCategory.budget 
        ? `/api/budgets/${budgetCategory.budget.id}` 
        : '/api/budgets'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: budgetCategory.id,
          amount: parseFloat(budgetForm.amount),
          period: budgetForm.period
        })
      })

      if (response.ok) {
        setShowBudgetModal(false)
        setBudgetCategory(null)
        setBudgetForm({ amount: '', period: 'MONTHLY' })
        fetchCategories()
      } else {
        const error = await response.json()
        showAlert({
          title: 'Error',
          message: error.error || 'Failed to set budget',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error setting budget:', error)
      showAlert({
        title: 'Error',
        message: 'Failed to set budget',
        type: 'error'
      })
    } finally {
      setBudgetLoading(false)
    }
  }

  const handleDeleteBudget = async (category: Category) => {
    if (!category.budget) return
    
    const confirmed = await showConfirm({
      title: 'Remove Budget',
      message: `Remove budget for "${category.name}"?`,
      confirmText: 'Remove',
      type: 'warning'
    })
    
    if (!confirmed) {
      closeConfirm()
      return
    }

    try {
      const response = await fetch(`/api/budgets/${category.budget.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchCategories()
      } else {
        const error = await response.json()
        showAlert({
          title: 'Error',
          message: error.error || 'Failed to remove budget',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Error removing budget:', error)
      showAlert({
        title: 'Error',
        message: 'Failed to remove budget',
        type: 'error'
      })
    }
    
    closeConfirm()
  }

  const openCategoryModal = (category?: Category) => {
    // Prevent editing of system categories
    if (category && category.name.toLowerCase() === 'others') {
      showAlert({
        title: 'Cannot Edit',
        message: 'System categories cannot be edited.',
        type: 'warning'
      })
      return
    }

    if (category) {
      setEditingCategory(category)
      setCategoryForm({
        name: category.name,
        color: category.color,
        icon: category.icon
      })
    } else {
      setEditingCategory(null)
      setCategoryForm({ name: '', color: '#4ECDC4', icon: 'Package' })
    }
    setShowCategoryModal(true)
  }

  const openBudgetModal = (category: Category) => {
    // Prevent setting budgets for system categories
    if (category.name.toLowerCase() === 'others') {
      showAlert({
        title: 'Cannot Set Budget',
        message: 'System categories cannot have budgets.',
        type: 'warning'
      })
      return
    }

    setBudgetCategory(category)
    setBudgetForm({
      amount: category.budget?.amount.toString() || '',
      period: category.budget?.period || 'MONTHLY'
    })
    setShowBudgetModal(true)
  }

  const getBudgetProgress = (category: Category) => {
    if (!category.budget) return 0
    return Math.min((category.budget.currentSpent / category.budget.amount) * 100, 100)
  }

  const getBudgetStatus = (category: Category) => {
    if (!category.budget) return 'none'
    const progress = getBudgetProgress(category)
    if (progress >= 100) return 'over'
    if (progress >= 80) return 'warning'
    return 'good'
  }

  const isSystemCategory = (category: Category) => {
    return category.name.toLowerCase() === 'others'
  }

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      'Coffee': Coffee,
      'ShoppingCart': ShoppingCart,
      'Home': Home,
      'Car': Car,
      'Fuel': Fuel,
      'Music': Music,
      'Smartphone': Smartphone,
      'CreditCard': CreditCard,
      'TrendingUp': TrendingUp,
      'Briefcase': Briefcase,
      'Building': Building,
      'Plane': Plane,
      'Book': Book,
      'Heart': Heart,
      'Gift': Gift,
      'Settings': Settings,
      'Package': Package,
      'DollarSign': DollarSign,
      'Target': Target
    }
    return iconMap[iconName] || Package
  }

  const filteredCategories = categories
    .filter(cat => cat.type === activeTab.toUpperCase())
    .sort((a, b) => a.name.localeCompare(b.name))

  const commonIcons = [
    { name: 'Package', icon: Package, label: 'Package' },
    { name: 'Coffee', icon: Coffee, label: 'Food & Drinks' },
    { name: 'ShoppingCart', icon: ShoppingCart, label: 'Shopping' },
    { name: 'Home', icon: Home, label: 'Housing' },
    { name: 'Car', icon: Car, label: 'Transportation' },
    { name: 'Fuel', icon: Fuel, label: 'Vehicle' },
    { name: 'Music', icon: Music, label: 'Entertainment' },
    { name: 'Smartphone', icon: Smartphone, label: 'Communication' },
    { name: 'CreditCard', icon: CreditCard, label: 'Financial' },
    { name: 'TrendingUp', icon: TrendingUp, label: 'Investments' },
    { name: 'DollarSign', icon: DollarSign, label: 'Income' },
    { name: 'Briefcase', icon: Briefcase, label: 'Business' },
    { name: 'Building', icon: Building, label: 'Business' },
    { name: 'Plane', icon: Plane, label: 'Travel' },
    { name: 'Book', icon: Book, label: 'Education' },
    { name: 'Heart', icon: Heart, label: 'Health' },
    { name: 'Gift', icon: Gift, label: 'Gifts' },
    { name: 'Settings', icon: Settings, label: 'Utilities' },
    { name: 'Target', icon: Target, label: 'Goals' }
  ]

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-heading">Budgets & Categories</h1>
          <p className="text-body text-sm lg:text-base">
            Manage your spending categories and set budgets to track your finances
          </p>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <button
            onClick={fetchCategories}
            disabled={loading}
            className="inline-flex items-center justify-center px-3 py-2 border border-input text-sm font-medium rounded-md text-muted bg-card hover:bg-card-hover focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 disabled:opacity-50"
            title="Refresh budget data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => openCategoryModal()}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-button-primary bg-button-primary hover:bg-button-primary-hover focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 flex-1 lg:flex-none"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-table-border">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('expense')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'expense'
                ? 'border-blue-500 text-status-info'
                : 'border-transparent text-muted hover:text-body hover:border-gray-300'
            }`}
          >
            Expense Categories
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'income'
                ? 'border-blue-500 text-status-info'
                : 'border-transparent text-muted hover:text-body hover:border-gray-300'
            }`}
          >
            Income Categories
          </button>
        </nav>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {filteredCategories.map((category) => {
          const budgetStatus = getBudgetStatus(category)
          const progress = getBudgetProgress(category)

          return (
            <div key={category.id} className="bg-card rounded-lg shadow-card p-4 lg:p-6 hover:shadow-md transition-shadow">
              {/* Category Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    {React.createElement(getIconComponent(category.icon), {
                      className: "w-5 h-5 lg:w-6 lg:h-6",
                      style: { color: category.color }
                    })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm lg:text-base font-semibold text-card-header truncate">
                      {category.name}
                    </h3>
                    <p className="text-xs text-muted capitalize">
                      {category.type.toLowerCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {!isSystemCategory(category) && (
                    <>
                      <button
                        onClick={() => openCategoryModal(category)}
                        className="p-1.5 text-icon-neutral hover:text-icon-neutral-hover hover:bg-button-secondary-hover rounded"
                        title="Edit category"
                      >
                        <Edit3 className="h-3 w-3 lg:h-4 lg:w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        disabled={deleteLoading}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded disabled:opacity-50"
                        title="Delete category"
                      >
                        {deleteLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Trash2 className="h-3 w-3 lg:h-4 lg:w-4" />
                        )}
                      </button>
                    </>
                  )}
                  {isSystemCategory(category) && (
                    <div className="px-2 py-1 text-xs text-muted bg-muted rounded">
                      System
                    </div>
                  )}
                </div>
              </div>

              {/* Budget Section - Only for expense categories (excluding system categories) */}
              {category.type === 'EXPENSE' && !isSystemCategory(category) ? (
                category.budget ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs lg:text-sm">
                      <span className="text-muted">Budget ({category.budget.period.toLowerCase()})</span>
                      <span className="font-medium text-card-header">
                        {formatAmount(category.budget.amount)}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted">Spent</span>
                        <span className={`font-medium ${
                          budgetStatus === 'over' ? 'text-status-error' : 
                          budgetStatus === 'warning' ? 'text-status-warning' : 'text-status-success'
                        }`}>
                          {formatAmount(category.budget.currentSpent)}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            budgetStatus === 'over' ? 'bg-status-error' : 
                            budgetStatus === 'warning' ? 'bg-status-warning' : 'bg-status-success'
                          }`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      
                      <div className="text-xs text-center space-y-1">
                        <div className="flex justify-center items-center space-x-2">
                          <span className="text-muted">
                            {formatAmount(category.budget.currentSpent)} of {formatAmount(category.budget.amount)}
                          </span>
                        </div>
                        <div>
                          <span className={`font-medium ${
                            budgetStatus === 'over' ? 'text-status-error' : 
                            budgetStatus === 'warning' ? 'text-status-warning' : 'text-status-success'
                          }`}>
                            {progress.toFixed(0)}% used
                          </span>
                          {budgetStatus === 'over' && (
                            <span className="text-status-error ml-2">
                              (Over by {formatAmount(category.budget.currentSpent - category.budget.amount)})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        onClick={() => openBudgetModal(category)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-input text-xs font-medium rounded-md text-input-label bg-input hover:bg-button-secondary-hover focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Edit Budget
                      </button>
                      <button
                        onClick={() => handleDeleteBudget(category)}
                        disabled={deleteLoading}
                        className="px-3 py-2 border border-red-300 text-xs font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        {deleteLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Target className="h-8 w-8 text-muted mx-auto mb-2" />
                    <p className="text-xs text-muted mb-3">No budget set</p>
                    <button
                      onClick={() => openBudgetModal(category)}
                      className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-medium rounded-md text-button-success bg-button-success hover:bg-button-success-hover focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 w-full"
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      Set Budget
                    </button>
                  </div>
                )
              ) : (
                <div className="text-center py-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                    category.type === 'INCOME' ? 'bg-status-success/20' : 'bg-muted'
                  }`}>
                    <DollarSign className={`h-6 w-6 ${
                      category.type === 'INCOME' ? 'text-status-success' : 'text-icon-neutral'
                    }`} />
                  </div>
                  <p className="text-xs text-muted">
                    {category.type === 'INCOME' ? 'Income Category' : 'System Category'}
                  </p>
                  {category.type !== 'INCOME' && (
                    <p className="text-xs text-muted mt-1">
                      Budget not allowed
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
            <Palette className="h-8 w-8 text-icon-neutral" />
          </div>
          <h3 className="text-lg font-medium text-heading mb-2">
            No {activeTab} categories yet
          </h3>
          <p className="text-body mb-6">
            Create your first {activeTab} category to start organizing your finances
          </p>
          <button
            onClick={() => openCategoryModal()}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-button-primary bg-button-primary hover:bg-button-primary-hover focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {activeTab} Category
          </button>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-modal-overlay overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-heading mb-4">
                {editingCategory ? 'Edit Category' : `Add ${activeTab} Category`}
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                    placeholder="Enter category name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Color
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="color"
                      value={categoryForm.color}
                      onChange={(e) => setCategoryForm({...categoryForm, color: e.target.value})}
                      className="w-14 h-12 border border-input rounded-lg cursor-pointer transition-all duration-200"
                    />
                    <div 
                      className="w-12 h-12 rounded-full border border-input shadow-sm"
                      style={{ backgroundColor: categoryForm.color }}
                    />
                    <span className="text-sm text-muted font-mono">{categoryForm.color}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-input-label mb-2">
                    Icon
                  </label>
                  <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto border border-input rounded-md p-2">
                    {commonIcons.map((iconItem) => (
                      <button
                        key={iconItem.name}
                        type="button"
                        onClick={() => setCategoryForm({...categoryForm, icon: iconItem.name})}
                        className={`w-10 h-10 flex items-center justify-center rounded hover:bg-button-secondary-hover transition-colors ${
                          categoryForm.icon === iconItem.name ? 'bg-button-primary text-button-primary' : 'text-icon-neutral hover:text-icon-neutral-hover'
                        }`}
                        title={iconItem.label}
                      >
                        {React.createElement(iconItem.icon, { className: "w-5 h-5" })}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-muted">
                    Selected: {commonIcons.find(i => i.name === categoryForm.icon)?.label || categoryForm.icon}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="bg-input py-3 px-6 border border-input rounded-lg shadow-sm text-base font-medium text-input-label hover:bg-button-secondary-hover transition-all duration-200 text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                  disabled={!categoryForm.name.trim() || createLoading || updateLoading}
                  className="bg-blue-600 border border-transparent rounded-lg shadow-sm py-3 px-6 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 flex items-center justify-center min-w-[140px]"
                >
                  {(editingCategory ? updateLoading : createLoading) ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    `${editingCategory ? 'Update' : 'Create'} Category`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Modal */}
      {showBudgetModal && budgetCategory && (
        <div className="fixed inset-0 bg-modal-overlay overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-card">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-heading mb-4">
                {budgetCategory.budget ? 'Edit Budget' : 'Set Budget'} for "{budgetCategory.name}"
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Budget Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={budgetForm.amount}
                    onChange={(e) => setBudgetForm({...budgetForm, amount: e.target.value})}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input placeholder-gray-400 transition-all duration-200"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-input-label mb-3">
                    Period
                  </label>
                  <select
                    value={budgetForm.period}
                    onChange={(e) => setBudgetForm({...budgetForm, period: e.target.value as 'MONTHLY' | 'YEARLY'})}
                    className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200 appearance-none bg-arrow-down bg-no-repeat bg-right bg-origin-content"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6">
                <button
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="bg-input py-3 px-6 border border-input rounded-lg shadow-sm text-base font-medium text-input-label hover:bg-button-secondary-hover transition-all duration-200 text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSetBudget}
                  disabled={!budgetForm.amount || parseFloat(budgetForm.amount) <= 0 || budgetLoading}
                  className="bg-green-600 border border-transparent rounded-lg shadow-sm py-3 px-6 text-base font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-all duration-200 flex items-center justify-center min-w-[140px]"
                >
                  {budgetLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    `${budgetCategory.budget ? 'Update' : 'Set'} Budget`
                  )}
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