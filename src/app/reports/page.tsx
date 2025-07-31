'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Download, FileText, Calendar, Filter, TrendingUp, DollarSign, PieChart } from 'lucide-react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useCurrency } from '@/hooks/useCurrency'
import { useModal } from '@/hooks/useModal'
import AlertModal from '@/components/AlertModal'
import ConfirmModal from '@/components/ConfirmModal'

export default function Reports() {
  const { data: session } = useSession()
  const { formatAmount } = useCurrency()
  const { alertModal, confirmModal, showAlert, showConfirm, closeAlert, closeConfirm } = useModal()
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [reportType, setReportType] = useState('summary')
  const [reportData, setReportData] = useState<any>(null)

  useEffect(() => {
    if (session) {
      setLoading(false)
      generateReport('json') // Load initial report data
    }
  }, [session])

  const generateReport = async (format: 'json' | 'csv' = 'json') => {
    if (!session) return

    setGenerating(true)
    try {
      const params = new URLSearchParams({
        type: reportType,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format
      })

      const response = await fetch(`/api/reports?${params}`)
      
      if (format === 'csv') {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      } else {
        const data = await response.json()
        setReportData(data)
      }
    } catch (error) {
      console.error('Error generating report:', error)
      showAlert({
        title: 'Report Error',
        message: 'Error generating report. Please try again.',
        type: 'error'
      })
    } finally {
      setGenerating(false)
    }
  }

  const downloadPredefinedReport = async (type: string, format: 'csv' | 'pdf' = 'csv') => {
    setGenerating(true)
    
    // For predefined reports, use current month for monthly, current year for yearly
    const now = new Date()
    let startDate: string
    let endDate: string

    if (type === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    } else if (type === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
      endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
    } else {
      startDate = dateRange.startDate
      endDate = dateRange.endDate
    }

    try {
      const params = new URLSearchParams({
        type: type === 'monthly' || type === 'yearly' ? 'summary' : 'category',
        startDate,
        endDate,
        format: 'csv'
      })

      const response = await fetch(`/api/reports?${params}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}-report-${startDate}-to-${endDate}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading report:', error)
      showAlert({
        title: 'Download Error',
        message: 'Error downloading report. Please try again.',
        type: 'error'
      })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <CurrencyLoader />
  }

  return (
    <div className="px-4 sm:px-6 lg:px-12 py-6 sm:py-8 lg:py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-heading">Reports</h1>
        <p className="mt-2 text-base text-muted">
          Generate detailed financial reports and export your data
        </p>
      </div>

      {/* Report Generation Form */}
      <div className="bg-card shadow-card rounded-lg mb-8">
        <div className="px-6 py-6 sm:p-8">
          <h3 className="text-xl font-semibold leading-6 text-heading mb-6">
            Generate Report
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div>
              <label htmlFor="reportType" className="block text-sm font-medium text-input-label mb-3">
                Report Type
              </label>
              <select
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200 appearance-none bg-arrow-down bg-no-repeat bg-right bg-origin-content"
              >
                <option value="summary">Summary Report</option>
                <option value="detailed">Detailed Transactions</option>
                <option value="category">Category Breakdown</option>
                <option value="budget">Budget Analysis</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-input-label mb-3">
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200"
              />
            </div>
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-input-label mb-3">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                className="block w-full px-4 py-3 border-input rounded-lg shadow-sm ring-focus border-input-focus:focus text-base bg-input text-input transition-all duration-200"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={() => generateReport('json')}
              disabled={generating}
              className="inline-flex items-center px-6 py-3 border border-input text-sm sm:text-base font-medium rounded-lg text-input-label bg-input hover:bg-button-secondary-hover disabled:opacity-50 transition-all duration-200 justify-center"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {generating ? 'Loading...' : 'Preview Report'}
            </button>
            <button
              onClick={() => generateReport('csv')}
              disabled={generating}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm sm:text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 justify-center"
            >
              <Download className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Download CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Report Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card p-6 sm:p-8 rounded-lg shadow-card hover:shadow-lg transition-all duration-200">
          <div className="flex items-center mb-6">
            <FileText className="h-8 w-8 text-status-info" />
            <h3 className="ml-3 text-lg font-semibold text-heading">
              Monthly Summary
            </h3>
          </div>
          <p className="text-base text-muted mb-6">
            Overview of income, expenses, and savings for the current month
          </p>
          <button 
            onClick={() => downloadPredefinedReport('monthly')}
            disabled={generating}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 text-sm sm:text-base font-medium"
          >
            {generating ? 'Generating...' : 'Download CSV'}
          </button>
        </div>

        <div className="bg-card p-6 sm:p-8 rounded-lg shadow-card hover:shadow-lg transition-all duration-200">
          <div className="flex items-center mb-6">
            <Calendar className="h-8 w-8 text-status-success" />
            <h3 className="ml-3 text-lg font-semibold text-heading">
              Yearly Report
            </h3>
          </div>
          <p className="text-base text-muted mb-6">
            Complete financial overview for the entire year with trends
          </p>
          <button 
            onClick={() => downloadPredefinedReport('yearly')}
            disabled={generating}
            className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all duration-200 text-sm sm:text-base font-medium"
          >
            {generating ? 'Generating...' : 'Download CSV'}
          </button>
        </div>

        <div className="bg-card p-6 sm:p-8 rounded-lg shadow-card hover:shadow-lg transition-all duration-200">
          <div className="flex items-center mb-6">
            <Filter className="h-8 w-8 text-status-info" />
            <h3 className="ml-3 text-lg font-semibold text-heading">
              Category Analysis
            </h3>
          </div>
          <p className="text-base text-muted mb-6">
            Detailed breakdown of spending by category with insights
          </p>
          <button 
            onClick={() => downloadPredefinedReport('category')}
            disabled={generating}
            className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all duration-200 text-sm sm:text-base font-medium"
          >
            {generating ? 'Generating...' : 'Download CSV'}
          </button>
        </div>
      </div>

      {/* Report Preview */}
      {reportData && (
        <div className="bg-card shadow-card rounded-lg mt-8">
          <div className="px-6 py-6 sm:p-8">
            <h3 className="text-xl font-semibold leading-6 text-heading mb-6">
              Report Preview - {reportType.charAt(0).toUpperCase() + reportType.slice(1)}
            </h3>
            
            {reportType === 'summary' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-status-info p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-8 w-8 text-status-info" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-status-info">Total Income</p>
                        <p className="text-2xl font-semibold text-status-info">
                          {formatAmount(reportData.summary.totalIncome)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-status-error p-4 rounded-lg">
                    <div className="flex items-center">
                      <TrendingUp className="h-8 w-8 text-status-error" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-status-error">Total Expenses</p>
                        <p className="text-2xl font-semibold text-status-error">
                          {formatAmount(reportData.summary.totalExpenses)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={`${reportData.summary.netAmount >= 0 ? 'bg-status-success' : 'bg-status-error'} p-4 rounded-lg`}>
                    <div className="flex items-center">
                      <PieChart className={`h-8 w-8 ${reportData.summary.netAmount >= 0 ? 'text-status-success' : 'text-status-error'}`} />
                      <div className="ml-4">
                        <p className={`text-sm font-medium ${reportData.summary.netAmount >= 0 ? 'text-status-success' : 'text-status-error'}`}>Net Amount</p>
                        <p className={`text-2xl font-semibold ${reportData.summary.netAmount >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                          {formatAmount(reportData.summary.netAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-muted" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-muted">Transactions</p>
                        <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                          {reportData.summary.transactionCount}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {reportData.budgetStatus && reportData.budgetStatus.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-heading mb-3">Budget Status</h4>
                    <div className="space-y-2">
                      {reportData.budgetStatus.map((budget: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                          <div>
                            <span className="font-medium text-heading">{budget.category}</span>
                            <span className="text-sm text-muted ml-2">
                              {formatAmount(budget.spent)} / {formatAmount(budget.budgetAmount)}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-medium ${parseFloat(budget.percentageUsed) >= 100 ? 'text-status-error' : parseFloat(budget.percentageUsed) >= 80 ? 'text-status-warning' : 'text-status-success'}`}>
                              {budget.percentageUsed}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {reportType === 'detailed' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-table-border">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-table-border">
                    {reportData.transactions.slice(0, 10).map((transaction: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-heading">
                          {new Date(transaction.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${transaction.type === 'income' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-heading">
                          {transaction.description || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-heading">
                          {transaction.category.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={transaction.amount >= 0 ? 'text-status-success' : 'text-status-error'}>
                            {formatAmount(Math.abs(transaction.amount))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportData.transactions.length > 10 && (
                  <p className="text-center text-sm text-muted mt-4">
                    Showing first 10 transactions. Download CSV for complete report.
                  </p>
                )}
              </div>
            )}
            
            {reportType === 'category' && (
              <div className="space-y-4">
                {reportData.categoryBreakdown.map((category: any, index: number) => (
                  <div key={index} className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-heading">{category.category}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${category.type === 'INCOME' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                        {category.type}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted">Expenses: </span>
                        <span className="font-medium text-status-error">{formatAmount(category.totalExpenses)}</span>
                      </div>
                      <div>
                        <span className="text-muted">Income: </span>
                        <span className="font-medium text-status-success">{formatAmount(category.totalIncome)}</span>
                      </div>
                      <div>
                        <span className="text-muted">Net: </span>
                        <span className={`font-medium ${category.netAmount >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                          {formatAmount(category.netAmount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted">Transactions: </span>
                        <span className="font-medium text-heading">{category.transactionCount}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {reportType === 'budget' && (
              <div className="space-y-4">
                {reportData.budgets.map((budget: any, index: number) => (
                  <div key={index} className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-heading">{budget.category}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full ${budget.status === 'good' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : budget.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
                        {budget.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted">Budget: </span>
                        <span className="font-medium text-heading">{formatAmount(budget.budgetAmount)}</span>
                      </div>
                      <div>
                        <span className="text-muted">Spent: </span>
                        <span className="font-medium text-status-error">{formatAmount(budget.spent)}</span>
                      </div>
                      <div>
                        <span className="text-muted">Remaining: </span>
                        <span className={`font-medium ${budget.remaining >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                          {formatAmount(budget.remaining)}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted">Used: </span>
                        <span className="font-medium text-heading">{budget.percentageUsed}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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