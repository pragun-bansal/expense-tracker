import { useToast } from '@/contexts/ToastContext'
import { useRouter } from 'next/navigation'

interface BudgetAlert {
  budgetId: string
  categoryName: string
  percentUsed: number
  alertSent: boolean
  reason?: string
}

export function useBudgetAlerts() {
  const { addToast } = useToast()
  const router = useRouter()

  const handleBudgetAlert = (budgetAlert: BudgetAlert | null) => {
    if (!budgetAlert || !budgetAlert.alertSent) return

    const isExceeded = budgetAlert.percentUsed >= 100
    const toastType = isExceeded ? 'error' : 'warning'
    const title = isExceeded ? 'Budget Exceeded!' : 'Budget Warning'
    const message = `Your ${budgetAlert.categoryName} budget is at ${budgetAlert.percentUsed.toFixed(1)}% usage${isExceeded ? ' and has been exceeded' : ''}.`

    addToast({
      type: toastType,
      title,
      message,
      duration: isExceeded ? 8000 : 6000, // Longer duration for exceeded budgets
      action: {
        label: 'View Budgets',
        onClick: () => router.push('/budgets-categories')
      }
    })
  }

  return { handleBudgetAlert }
}