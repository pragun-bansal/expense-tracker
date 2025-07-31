import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

// Query keys for consistent caching
export const queryKeys = {
  analytics: (period: string) => ['analytics', period],
  dashboard: () => ['dashboard', 'stats'],
  categories: (type?: string) => ['categories', type],
  accounts: () => ['accounts'],
  transactions: (page: number, filters?: any) => ['transactions', page, filters],
  groups: () => ['groups'],
  budgets: () => ['budgets'],
  recurringExpenses: () => ['recurring-expenses'],
}