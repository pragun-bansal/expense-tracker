'use client'

import dynamic from 'next/dynamic'
import { CurrencyLoader } from '@/components/CurrencyLoader'

// Lazy load heavy page components
export const LazyAnalyticsPage = dynamic(() => import('@/app/analytics/page'), {
  loading: () => <CurrencyLoader />,
  ssr: false
})

export const LazyReportsPage = dynamic(() => import('@/app/reports/page'), {
  loading: () => <CurrencyLoader />,
  ssr: false
})

export const LazyAccountsPage = dynamic(() => import('@/app/accounts/page'), {
  loading: () => <CurrencyLoader />,
  ssr: false
})

export const LazyTransactionsPage = dynamic(() => import('@/app/transactions/page'), {
  loading: () => <CurrencyLoader />,
  ssr: false
})

export const LazyBudgetsCategoriesPage = dynamic(() => import('@/app/budgets-categories/page'), {
  loading: () => <CurrencyLoader />,
  ssr: false
})

// Loading component for general use
export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
      <p className="mt-4 text-muted">Loading page...</p>
    </div>
  </div>
)