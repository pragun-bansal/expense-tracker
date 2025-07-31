'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { CurrencyLoader } from '@/components/CurrencyLoader'
import { useCurrency } from '@/hooks/useCurrency'
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  PieChart as PieChartIcon,
  Target,
  Calendar,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Users,
  Repeat,
  AlertTriangle
} from 'lucide-react'

interface AnalyticsData {
  period: string
  summary: {
    totalExpenses: number
    totalIncome: number
    netIncome: number
    netWorth: number
    expenseGrowth: number
    incomeGrowth: number
    savingsRate: number
    transactionCount: number
  }
  expensesByCategory: Array<{
    name: string
    value: number
    color: string
  }>
  incomesByCategory: Array<{
    name: string
    value: number
    color: string
  }>
  monthlyTrends: Array<{
    month: string
    expenses: number
    income: number
    net: number
  }>
  weeklyTrends: Array<{
    week: string
    expenses: number
    income: number
    transactions: number
  }>
  accountBalances: Array<{
    name: string
    balance: number
    type: string
    color: string
  }>
  topExpenses: Array<{
    description: string
    amount: number
    category: string
    date: string
  }>
  budgetUtilization: Array<{
    category: string
    spent: number
    budget: number
    percentage: number
  }>
  recurringExpenses: Array<{
    name: string
    amount: number
    frequency: string
    nextDue: string
  }>
}

export default function Analytics() {
  const { data: session } = useSession()
  const { formatAmount } = useCurrency()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (session) {
      fetchAnalytics()
    }
  }, [session, period])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/analytics?period=${period}`, {
        headers: {
          'Cache-Control': 'public, max-age=300'
        }
      })
      
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      } else {
        console.error('Analytics API error:', response.status)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{
      color: string
      name: string
      value: number
    }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card p-4 border border-card-border rounded-xl shadow-lg backdrop-blur-sm">
          <p className="font-semibold text-heading mb-2">{label}</p>
          {payload.map((item, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-body">
                {item.name}: {formatAmount(item.value)}
              </span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    trend, 
    trendValue, 
    color = 'text-primary',
    delay = 0 
  }: {
    title: string
    value: string | number
    icon: React.ComponentType<{ className?: string }>
    trend?: 'up' | 'down' | 'neutral'
    trendValue?: string
    color?: string
    delay?: number
  }) => (
    <div 
      className={`bg-card p-4 sm:p-6 rounded-xl shadow-card hover:shadow-lg transition-all duration-500 border border-card-border group hover:-translate-y-1 animate-fade-in`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
            <div className={`p-1.5 sm:p-2 rounded-lg ${color.replace('text-', 'bg-').replace('text-', '').includes('success') ? 'bg-green-100' : color.includes('error') ? 'bg-red-100' : color.includes('warning') ? 'bg-yellow-100' : 'bg-blue-100'} group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${color}`} />
            </div>
            <h3 className="text-xs sm:text-sm font-medium text-muted truncate">{title}</h3>
          </div>
          <p className="text-lg sm:text-2xl font-bold text-heading mb-1 sm:mb-2 group-hover:scale-105 transition-transform duration-300 break-all">
            {typeof value === 'number' ? formatAmount(value) : value}
          </p>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-xs sm:text-sm ${
              trend === 'up' ? 'text-status-success' : 
              trend === 'down' ? 'text-status-error' : 
              'text-muted'
            }`}>
              {trend === 'up' ? (
                <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : trend === 'down' ? (
                <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : null}
              <span className="truncate">{trendValue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  if (loading) {
    return <CurrencyLoader />
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <div className="text-lg text-gray-600">No analytics data available</div>
          <p className="text-sm text-gray-500 mt-2">Start adding transactions to see insights</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'categories', label: 'Categories', icon: PieChartIcon },
    { id: 'budgets', label: 'Budgets', icon: Target },
  ]


  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-6 sm:space-y-8">
      {/* Animated Header */}
      <div className="mb-6 sm:mb-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-heading bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Financial Analytics
            </h1>
            <p className="text-muted mt-1 sm:mt-2 text-xs sm:text-sm md:text-base">
              Comprehensive insights into your financial health
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 sm:px-4 py-2 border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-primary text-xs sm:text-sm bg-input text-input transition-all duration-200"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">Last 3 Months</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-card-border mb-6 sm:mb-8 animate-fade-in" style={{ animationDelay: '200ms' }}>
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-thin pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 py-3 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all duration-300 min-w-max ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted hover:text-body hover:border-card-border'
                }`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <StatCard
              title="Total Income"
              value={data.summary.totalIncome}
              icon={TrendingUp}
              trend={data.summary.incomeGrowth > 0 ? 'up' : data.summary.incomeGrowth < 0 ? 'down' : 'neutral'}
              trendValue={`${data.summary.incomeGrowth > 0 ? '+' : ''}${data.summary.incomeGrowth.toFixed(1)}%`}
              color="text-status-success"
              delay={0}
            />
            <StatCard
              title="Total Expenses"
              value={data.summary.totalExpenses}
              icon={TrendingDown}
              trend={data.summary.expenseGrowth > 0 ? 'up' : data.summary.expenseGrowth < 0 ? 'down' : 'neutral'}
              trendValue={`${data.summary.expenseGrowth > 0 ? '+' : ''}${data.summary.expenseGrowth.toFixed(1)}%`}
              color="text-status-error"
              delay={100}
            />
            <StatCard
              title="Net Income"
              value={data.summary.netIncome}
              icon={DollarSign}
              color={data.summary.netIncome >= 0 ? 'text-status-success' : 'text-status-error'}
              delay={200}
            />
            <StatCard
              title="Savings Rate"
              value={`${data.summary.savingsRate.toFixed(1)}%`}
              icon={Target}
              color="text-primary"
              delay={300}
            />
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <StatCard
              title="Net Worth"
              value={data.summary.netWorth}
              icon={Wallet}
              color="text-purple-600"
              delay={400}
            />
            <StatCard
              title="Transactions"
              value={data.summary.transactionCount}
              icon={Activity}
              color="text-blue-600"
              delay={500}
            />
            <StatCard
              title="Recurring Expenses"
              value={data.recurringExpenses?.length || 0}
              icon={Repeat}
              color="text-orange-600"
              delay={600}
            />
            <StatCard
              title="Active Accounts"
              value={data.accountBalances?.length || 0}
              icon={CreditCard}
              color="text-indigo-600"
              delay={700}
            />
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Recent Expenses */}
            <div className="bg-card p-4 sm:p-6 rounded-xl shadow-card border border-card-border animate-fade-in" style={{ animationDelay: '800ms' }}>
              <h3 className="text-base sm:text-lg font-semibold text-heading mb-3 sm:mb-4 flex items-center gap-2">
                <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 text-status-error" />
                Top Expenses
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {data.topExpenses?.slice(0, 5).map((expense, index) => (
                  <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-background rounded-lg hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-xs sm:text-sm font-medium text-heading truncate">{expense.description}</p>
                      <p className="text-xs text-muted truncate">{expense.category} • {new Date(expense.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-status-error shrink-0">
                      {formatAmount(expense.amount)}
                    </div>
                  </div>
                )) || (
                  <p className="text-xs sm:text-sm text-muted text-center py-4">No recent expenses</p>
                )}
              </div>
            </div>

            {/* Account Overview */}
            <div className="bg-card p-4 sm:p-6 rounded-xl shadow-card border border-card-border animate-fade-in" style={{ animationDelay: '900ms' }}>
              <h3 className="text-base sm:text-lg font-semibold text-heading mb-3 sm:mb-4 flex items-center gap-2">
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Account Balances
              </h3>
              <div className="space-y-2 sm:space-y-3">
                {data.accountBalances?.slice(0, 5).map((account, index) => (
                  <div key={index} className="flex items-center justify-between p-2 sm:p-3 bg-background rounded-lg">
                    <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 mr-2">
                      <div 
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0" 
                        style={{ backgroundColor: account.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-heading truncate">{account.name}</p>
                        <p className="text-xs text-muted capitalize">{account.type}</p>
                      </div>
                    </div>
                    <div className={`text-xs sm:text-sm font-semibold shrink-0 ${account.balance >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                      {formatAmount(account.balance)}
                    </div>
                  </div>
                )) || (
                  <p className="text-xs sm:text-sm text-muted text-center py-4">No accounts found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6 sm:space-y-8">
          {/* Monthly Trends */}
          <div className="bg-card p-4 sm:p-6 rounded-xl shadow-card border border-card-border animate-fade-in">
            <h3 className="text-base sm:text-lg font-semibold text-heading mb-4 sm:mb-6 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Income vs Expenses Trend
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.monthlyTrends}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="income" stroke="#10B981" fillOpacity={1} fill="url(#incomeGradient)" strokeWidth={2} name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="#EF4444" fillOpacity={1} fill="url(#expenseGradient)" strokeWidth={2} name="Expenses" />
                <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={3} name="Net" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Activity */}
          <div className="bg-card p-4 sm:p-6 rounded-xl shadow-card border border-card-border animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h3 className="text-base sm:text-lg font-semibold text-heading mb-4 sm:mb-6 flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              Weekly Activity
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.weeklyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="week" stroke="#6B7280" fontSize={12} />
                <YAxis yAxisId="amount" orientation="left" stroke="#6B7280" fontSize={12} />
                <YAxis yAxisId="count" orientation="right" stroke="#8B5CF6" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar yAxisId="amount" dataKey="expenses" fill="#EF4444" name="Expenses" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="amount" dataKey="income" fill="#10B981" name="Income" radius={[4, 4, 0, 0]} />
                <Line yAxisId="count" type="monotone" dataKey="transactions" stroke="#8B5CF6" strokeWidth={2} name="Transaction Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Expense Categories */}
            <div className="bg-card p-6 rounded-xl shadow-card border border-card-border animate-fade-in">
              <h3 className="text-lg font-semibold text-heading mb-6 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-status-error" />
                Expenses by Category
              </h3>
              {data.expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={data.expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-muted">
                  <div className="text-center">
                    <PieChartIcon className="h-12 w-12 mx-auto mb-2 text-muted" />
                    <p>No expense data available</p>
                  </div>
                </div>
              )}
            </div>

            {/* Income Categories */}
            <div className="bg-card p-6 rounded-xl shadow-card border border-card-border animate-fade-in" style={{ animationDelay: '200ms' }}>
              <h3 className="text-lg font-semibold text-heading mb-6 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-status-success" />
                Income by Category
              </h3>
              {data.incomesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={data.incomesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {data.incomesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[350px] text-muted">
                  <div className="text-center">
                    <PieChartIcon className="h-12 w-12 mx-auto mb-2 text-muted" />
                    <p>No income data available</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Budgets Tab */}
      {activeTab === 'budgets' && (
        <div className="space-y-8">
          {/* Budget Utilization */}
          <div className="bg-card p-6 rounded-xl shadow-card border border-card-border animate-fade-in">
            <h3 className="text-lg font-semibold text-heading mb-6 flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Budget Utilization
            </h3>
            {data.budgetUtilization && data.budgetUtilization.length > 0 ? (
              <div className="space-y-4">
                {data.budgetUtilization.map((budget, index) => (
                  <div key={index} className="p-4 bg-background rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-heading">{budget.category}</span>
                      <span className="text-sm text-muted">
                        {formatAmount(budget.spent)} / {formatAmount(budget.budget)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-1000 ${
                          budget.percentage > 90 ? 'bg-status-error' :
                          budget.percentage > 75 ? 'bg-status-warning' :
                          'bg-status-success'
                        }`}
                        style={{ 
                          width: `${Math.min(budget.percentage, 100)}%`,
                          animationDelay: `${index * 100}ms`
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-medium ${
                        budget.percentage > 90 ? 'text-status-error' :
                        budget.percentage > 75 ? 'text-status-warning' :
                        'text-status-success'
                      }`}>
                        {budget.percentage.toFixed(1)}% used
                      </span>
                      {budget.percentage > 90 && (
                        <div className="flex items-center gap-1 text-status-error">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Over budget</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted">
                <div className="text-center">
                  <Target className="h-12 w-12 mx-auto mb-2 text-muted" />
                  <p>No budget data available</p>
                  <p className="text-sm mt-1">Set up budgets to track your spending</p>
                </div>
              </div>
            )}
          </div>

          {/* Recurring Expenses */}
          <div className="bg-card p-6 rounded-xl shadow-card border border-card-border animate-fade-in" style={{ animationDelay: '200ms' }}>
            <h3 className="text-lg font-semibold text-heading mb-6 flex items-center gap-2">
              <Repeat className="h-5 w-5 text-primary" />
              Recurring Expenses
            </h3>
            {data.recurringExpenses && data.recurringExpenses.length > 0 ? (
              <div className="space-y-3">
                {data.recurringExpenses.map((expense, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-background rounded-lg hover:bg-gray-50 transition-colors duration-200">
                    <div className="flex-1">
                      <p className="font-medium text-heading">{expense.name}</p>
                      <p className="text-sm text-muted capitalize">
                        {expense.frequency} • Next: {new Date(expense.nextDue).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-heading">{formatAmount(expense.amount)}</p>
                      <p className="text-xs text-muted">per {expense.frequency.toLowerCase()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted">
                <div className="text-center">
                  <Repeat className="h-12 w-12 mx-auto mb-2 text-muted" />
                  <p>No recurring expenses found</p>
                  <p className="text-sm mt-1">Set up recurring expenses to automate tracking</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}