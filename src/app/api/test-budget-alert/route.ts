import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkBudgetAlert } from '@/lib/budgetAlerts'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { categoryId } = await request.json()

    if (!categoryId) {
      return NextResponse.json(
        { error: 'categoryId is required' },
        { status: 400 }
      )
    }

    console.log(`🧪 Testing budget alert for user ${session.user.id}, category ${categoryId}`)

    const result = await checkBudgetAlert(session.user.id, categoryId)

    if (!result) {
      return NextResponse.json({
        message: 'No budget found for this category',
        result: null
      })
    }

    return NextResponse.json({
      message: 'Budget alert check completed',
      result: {
        budgetId: result.budgetId,
        categoryName: result.categoryName,
        percentUsed: result.percentUsed,
        alertSent: result.alertSent,
        reason: result.reason
      }
    })
  } catch (error) {
    console.error('Error testing budget alert:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}