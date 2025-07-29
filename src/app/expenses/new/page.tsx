'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, X, Scan, Loader } from 'lucide-react'
import { useBudgetAlerts } from '@/hooks/useBudgetAlerts'
import { analyzeReceiptImage, compressImage, type ReceiptData } from '@/lib/receiptAnalysis'
import { useCurrency } from '@/hooks/useCurrency'

interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

interface Account {
  id: string
  name: string
  type: string
  balance: number
}

export default function NewExpense() {
  const { data: session } = useSession()
  const router = useRouter()
  const { handleBudgetAlert } = useBudgetAlerts()
  const { formatAmount } = useCurrency()
  
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    accountId: '',
    date: new Date().toISOString().split('T')[0],
    receiptUrl: '',
    isRecurring: false
  })
  
  const [categories, setCategories] = useState<Category[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [analyzingReceipt, setAnalyzingReceipt] = useState(false)
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null)
  const [showReceiptAnalysis, setShowReceiptAnalysis] = useState(false)

  useEffect(() => {
    if (session) {
      fetchCategories()
      fetchAccounts()
    }
  }, [session])

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
        
        // Set default account to "Others" if no accountId is set
        if (!formData.accountId) {
          const othersAccount = data.find((account: Account) => account.type === 'OTHERS_FIXED')
          if (othersAccount) {
            setFormData(prev => ({ ...prev, accountId: othersAccount.id }))
          }
        }
      }
    } catch (error) {
      console.error('Error fetching accounts:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        
        // Handle budget alerts if present
        if (data.budgetAlert) {
          handleBudgetAlert(data.budgetAlert)
        }
        
        router.push('/expenses')
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to create expense')
      }
    } catch (error) {
      setError('Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    setError('')

    try {
      // Compress image before upload
      const compressedFile = await compressImage(file, 1024, 0.8)
      
      const formData = new FormData()
      formData.append('file', compressedFile)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({
          ...prev,
          receiptUrl: data.url
        }))
        setUploadedFile(file)
        
        // Automatically start OCR analysis
        analyzeReceipt(file)
      } else {
        const error = await response.json()
        setError(error.error || 'Failed to upload file')
      }
    } catch (error) {
      setError('Failed to upload file')
    } finally {
      setUploadingFile(false)
    }
  }

  const analyzeReceipt = async (file: File) => {
    setAnalyzingReceipt(true)
    setError('')

    try {
      console.log('🔍 Starting receipt analysis for file:', file.name)
      const result = await analyzeReceiptImage(file)
      console.log('📊 OCR Result:', result)
      
      if (result.success && result.data) {
        setReceiptData(result.data)
        setShowReceiptAnalysis(true)
        
        // Show success message
        if (result.data.amount || result.data.merchantName || result.data.date) {
          console.log('✅ Receipt analyzed successfully:', result.data)
          // Auto-apply if we have key data
          if (result.data.amount && result.data.merchantName) {
            console.log('🚀 Auto-applying receipt data...')
            const dataToApply = result.data
            setTimeout(() => {
              if (dataToApply) {
                applyReceiptDataWithData(dataToApply)
              }
            }, 1500) // Give user a moment to see the modal
          }
        } else {
          console.log('⚠️ No useful data extracted from receipt')
        }
      } else {
        console.error('❌ Receipt analysis failed:', result.error)
        setError(result.error || 'Failed to analyze receipt')
      }
    } catch (error) {
      console.error('Receipt analysis error:', error)
      setError('Failed to analyze receipt')
    } finally {
      setAnalyzingReceipt(false)
    }
  }

  const applyReceiptDataWithData = (data: ReceiptData) => {
    const updates: any = {}
    
    if (data.amount) {
      updates.amount = data.amount.toString()
    }
    
    if (data.date) {
      updates.date = data.date
    }
    
    if (data.merchantName) {
      updates.description = data.merchantName
    }
    
    // Try to match category
    if (data.category) {
      const matchingCategory = categories.find(cat => 
        cat.name.toLowerCase().includes(data.category!.toLowerCase()) ||
        data.category!.toLowerCase().includes(cat.name.toLowerCase())
      )
      if (matchingCategory) {
        updates.categoryId = matchingCategory.id
      }
    }

    console.log('📝 Applying receipt data to form:', updates)
    setFormData(prev => ({ ...prev, ...updates }))
    setShowReceiptAnalysis(false)
  }

  const applyReceiptData = () => {
    if (!receiptData) return
    applyReceiptDataWithData(receiptData)
  }

  const dismissReceiptAnalysis = () => {
    setShowReceiptAnalysis(false)
    setReceiptData(null)
  }

  const removeUploadedFile = () => {
    setFormData(prev => ({
      ...prev,
      receiptUrl: ''
    }))
    setUploadedFile(null)
    setReceiptData(null)
    setShowReceiptAnalysis(false)
  }

  return (
    <div className="min-h-screen bg-page">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href="/expenses"
            className="inline-flex items-center text-sm font-medium text-link text-link:hover"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Expenses
          </Link>
        </div>

        <div className="bg-card shadow-card rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-card-header mb-6">
              Add New Expense
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-input-label">
                  Amount *
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    step="0.01"
                    name="amount"
                    id="amount"
                    required
                    value={formData.amount}
                    onChange={handleInputChange}
                    className="block w-full border-input rounded-md shadow-sm ring-focus border-input-focus:focus sm:text-sm bg-input text-input"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-input-label">
                  Description
                </label>
                <div className="mt-1">
                  <textarea
                    name="description"
                    id="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="block w-full border-input rounded-md shadow-sm ring-focus border-input-focus:focus sm:text-sm bg-input text-input"
                    placeholder="What did you spend on?"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="categoryId" className="block text-sm font-medium text-input-label">
                    Category *
                  </label>
                  <div className="mt-1">
                    <select
                      name="categoryId"
                      id="categoryId"
                      required
                      value={formData.categoryId}
                      onChange={handleInputChange}
                      className="block w-full border-input rounded-md shadow-sm ring-focus border-input-focus:focus sm:text-sm bg-input text-input"
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="accountId" className="block text-sm font-medium text-input-label">
                    Account (Optional)
                  </label>
                  <div className="mt-1">
                    <select
                      name="accountId"
                      id="accountId"
                      value={formData.accountId}
                      onChange={handleInputChange}
                      className="block w-full border-input rounded-md shadow-sm ring-focus border-input-focus:focus sm:text-sm bg-input text-input"
                    >
                      {accounts
                        .filter(account => account.type === 'OTHERS_FIXED')
                        .map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.name} (Default)
                          </option>
                        ))}
                      <optgroup label="Personal Accounts">
                        {accounts
                          .filter(account => !['OTHERS_FIXED', 'GROUP_LENDING'].includes(account.type))
                          .map((account) => (
                            <option key={account.id} value={account.id}>
                              {account.name} ({formatAmount(account.balance)})
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="date" className="block text-sm font-medium text-input-label">
                  Date
                </label>
                <div className="mt-1">
                  <input
                    type="date"
                    name="date"
                    id="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="block w-full border-input rounded-md shadow-sm ring-focus border-input-focus:focus sm:text-sm bg-input text-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-input-label">
                  Receipt Image
                </label>
                <div className="mt-1">
                  {!uploadedFile ? (
                    <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-input border-dashed rounded-md">
                      <div className="space-y-1 text-center">
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-muted">
                          <label
                            htmlFor="file-upload"
                            className="relative cursor-pointer bg-card rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                          >
                            <span>Upload a file</span>
                            <input
                              id="file-upload"
                              name="file-upload"
                              type="file"
                              className="sr-only"
                              accept="image/*"
                              onChange={handleFileUpload}
                              disabled={uploadingFile}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-muted">
                          PNG, JPG, GIF up to 5MB
                        </p>
                        {uploadingFile && (
                          <p className="text-xs text-blue-600">Uploading and compressing...</p>
                        )}
                        {analyzingReceipt && (
                          <div className="flex items-center justify-center space-x-2 text-xs text-blue-600">
                            <Loader className="h-4 w-4 animate-spin" />
                            <span>Analyzing receipt with OCR...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div className="flex items-center">
                          <Upload className="h-5 w-5 text-gray-400 mr-2" />
                          <div className="flex flex-col">
                            <span className="text-sm text-heading">{uploadedFile.name}</span>
                            {analyzingReceipt && (
                              <div className="flex items-center space-x-2 text-xs text-blue-600 mt-1">
                                <Loader className="h-3 w-3 animate-spin" />
                                <span>Analyzing with OCR...</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {receiptData && !analyzingReceipt && (
                            <button
                              type="button"
                              onClick={() => setShowReceiptAnalysis(true)}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="View receipt analysis"
                            >
                              <Scan className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={removeUploadedFile}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="isRecurring"
                  id="isRecurring"
                  checked={formData.isRecurring}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isRecurring" className="ml-2 block text-sm text-heading">
                  This is a recurring expense
                </label>
              </div>

              {error && (
                <div className="text-status-error text-sm">{error}</div>
              )}

              <div className="flex justify-end space-x-3">
                <Link
                  href="/expenses"
                  className="bg-input py-2 px-4 border border-input rounded-md shadow-sm text-sm font-medium text-input-label hover:bg-button-secondary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isLoading ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Receipt Analysis Modal */}
      {showReceiptAnalysis && receiptData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-input">
              <h3 className="text-lg font-medium text-card-header">Receipt Analysis Results</h3>
            </div>
            <div className="px-6 py-4">
              <div className="space-y-3">
                {receiptData.merchantName && (
                  <div>
                    <label className="text-sm font-medium text-input-label">Merchant:</label>
                    <p className="text-sm text-heading">{receiptData.merchantName}</p>
                  </div>
                )}
                {receiptData.amount && (
                  <div>
                    <label className="text-sm font-medium text-input-label">Amount:</label>
                    <p className="text-sm text-heading">{formatAmount(receiptData.amount)}</p>
                  </div>
                )}
                {receiptData.date && (
                  <div>
                    <label className="text-sm font-medium text-input-label">Date:</label>
                    <p className="text-sm text-heading">{receiptData.date}</p>
                  </div>
                )}
                {receiptData.category && (
                  <div>
                    <label className="text-sm font-medium text-input-label">Suggested Category:</label>
                    <p className="text-sm text-heading">{receiptData.category}</p>
                  </div>
                )}
                {receiptData.items && receiptData.items.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-input-label">Items:</label>
                    <div className="text-sm text-heading max-h-20 overflow-y-auto">
                      {receiptData.items.slice(0, 5).map((item, index) => (
                        <p key={index}>• {item}</p>
                      ))}
                      {receiptData.items.length > 5 && (
                        <p className="text-muted">... and {receiptData.items.length - 5} more items</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-input flex justify-end space-x-3">
              <button
                onClick={dismissReceiptAnalysis}
                className="px-4 py-2 text-sm font-medium text-input-label bg-input border border-input rounded-md hover:bg-button-secondary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Dismiss
              </button>
              <button
                onClick={applyReceiptData}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Apply to Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}