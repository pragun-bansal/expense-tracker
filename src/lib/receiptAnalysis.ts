import Tesseract from 'tesseract.js'

export interface ReceiptData {
  merchantName?: string
  amount?: number
  date?: string
  items?: string[]
  category?: string
  rawText: string
}

export interface ReceiptAnalysisResult {
  success: boolean
  data?: ReceiptData
  error?: string
  confidence?: number
}

// Common merchant patterns and their likely categories
const MERCHANT_CATEGORIES: Record<string, string> = {
  // Grocery stores
  'walmart': 'Food & Groceries',
  'target': 'Shopping',
  'kroger': 'Food & Groceries',
  'safeway': 'Food & Groceries',
  'whole foods': 'Food & Groceries',
  'trader joe': 'Food & Groceries',
  'costco': 'Food & Groceries',
  
  // Restaurants
  'mcdonald': 'Food & Dining',
  'starbucks': 'Food & Dining',
  'subway': 'Food & Dining',
  'pizza': 'Food & Dining',
  'restaurant': 'Food & Dining',
  'cafe': 'Food & Dining',
  'bar': 'Food & Dining',
  
  // Gas stations
  'shell': 'Transportation',
  'exxon': 'Transportation',
  'chevron': 'Transportation',
  'bp': 'Transportation',
  'mobil': 'Transportation',
  'gas': 'Transportation',
  'fuel': 'Transportation',
  
  // Pharmacies
  'cvs': 'Health & Medical',
  'walgreens': 'Health & Medical',
  'pharmacy': 'Health & Medical',
  'rite aid': 'Health & Medical',
  
  // Retail
  'amazon': 'Shopping',
  'best buy': 'Electronics',
  'home depot': 'Home & Garden',
  'lowes': 'Home & Garden',
  'apple': 'Electronics',
  'microsoft': 'Electronics'
}

// Patterns for extracting information from receipt text
const AMOUNT_PATTERNS = [
  /(?:total|amount|sum|balance due)[\s:]*\$?(\d+\.\d{2})/i,
  /\$(\d+\.\d{2})(?:\s*(?:total|amount|sum))?/i,
  /(?:grand total|final total)[\s:]*\$?(\d+\.\d{2})/i,
  /(?:amount due|balance)[\s:]*\$?(\d+\.\d{2})/i
]

const DATE_PATTERNS = [
  /(\d{1,2}\/\d{1,2}\/\d{2,4})/,
  /(\d{1,2}-\d{1,2}-\d{2,4})/,
  /(\d{4}-\d{1,2}-\d{1,2})/,
  /(?:date|purchased|transaction)[\s:]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  /(?:date|purchased|transaction)[\s:]*(\d{1,2}-\d{1,2}-\d{2,4})/i
]

export async function analyzeReceiptImage(imageFile: File): Promise<ReceiptAnalysisResult> {
  try {
    console.log('Starting OCR analysis for receipt...')
    
    // Perform OCR on the image
    const { data: { text, confidence } } = await Tesseract.recognize(
      imageFile,
      'eng',
      {
        logger: m => console.log('OCR Progress:', m)
      }
    )

    console.log('OCR completed with confidence:', confidence)
    console.log('Extracted text:', text)

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: 'No text could be extracted from the receipt image'
      }
    }

    // Parse the extracted text
    const receiptData = parseReceiptText(text)
    
    return {
      success: true,
      data: receiptData,
      confidence: confidence
    }

  } catch (error) {
    console.error('Error analyzing receipt:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze receipt'
    }
  }
}

function parseReceiptText(text: string): ReceiptData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  const receiptData: ReceiptData = {
    rawText: text,
    items: []
  }

  // Extract merchant name (usually in the first few lines)
  receiptData.merchantName = extractMerchantName(lines)
  
  // Extract amount
  receiptData.amount = extractAmount(text)
  
  // Extract date
  receiptData.date = extractDate(text)
  
  // Extract items (simplified - look for lines with prices)
  receiptData.items = extractItems(lines)
  
  // Suggest category based on merchant
  receiptData.category = suggestCategory(receiptData.merchantName || '', text)

  return receiptData
}

function extractMerchantName(lines: string[]): string | undefined {
  // Look for merchant name in the first few lines
  // Usually the longest line in the first 5 lines, or contains common store indicators
  const firstFiveLines = lines.slice(0, 5)
  
  for (const line of firstFiveLines) {
    // Skip short lines, numbers, addresses
    if (line.length < 3 || /^\d+$/.test(line) || /^\d+\s+\w+\s+(st|ave|rd|blvd|way)/i.test(line)) {
      continue
    }
    
    // Check if it contains common merchant indicators
    const lowerLine = line.toLowerCase()
    for (const merchant in MERCHANT_CATEGORIES) {
      if (lowerLine.includes(merchant)) {
        return line
      }
    }
    
    // If it's a substantial line without obvious non-merchant patterns, consider it
    if (line.length > 5 && !/^[\d\s\.\-\(\)]+$/.test(line) && !line.includes('@')) {
      return line
    }
  }
  
  // Fallback: return the longest line in first 3 lines
  const longestLine = firstFiveLines.reduce((longest, current) => 
    current.length > longest.length ? current : longest, ''
  )
  
  return longestLine.length > 2 ? longestLine : undefined
}

function extractAmount(text: string): number | undefined {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const amount = parseFloat(match[1])
      if (!isNaN(amount) && amount > 0) {
        return amount
      }
    }
  }
  
  // Fallback: look for any dollar amount in the last part of the text
  const lines = text.split('\n')
  const lastLines = lines.slice(-10) // Check last 10 lines
  
  for (const line of lastLines.reverse()) {
    const amountMatch = line.match(/\$?(\d+\.\d{2})/g)
    if (amountMatch) {
      const amounts = amountMatch.map(amount => parseFloat(amount.replace('$', '')))
      const maxAmount = Math.max(...amounts.filter(a => !isNaN(a)))
      if (maxAmount > 0) {
        return maxAmount
      }
    }
  }
  
  return undefined
}

function extractDate(text: string): string | undefined {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      const dateStr = match[1]
      const date = parseDate(dateStr)
      if (date && !isNaN(date.getTime())) {
        return date.toISOString().split('T')[0] // Return YYYY-MM-DD format
      }
    }
  }
  
  return undefined
}

function parseDate(dateStr: string): Date | null {
  // Try different date formats
  const formats = [
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/, // MM/DD/YYYY or MM/DD/YY
    /^(\d{1,2})-(\d{1,2})-(\d{2,4})$/, // MM-DD-YYYY or MM-DD-YY
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/ // YYYY-MM-DD
  ]
  
  for (const format of formats) {
    const match = dateStr.match(format)
    if (match) {
      let year: number, month: number, day: number
      
      if (format === formats[2]) { // YYYY-MM-DD
        year = parseInt(match[1])
        month = parseInt(match[2]) - 1 // JS months are 0-indexed
        day = parseInt(match[3])
      } else { // MM/DD/YYYY or MM-DD-YYYY
        month = parseInt(match[1]) - 1 // JS months are 0-indexed
        day = parseInt(match[2])
        year = parseInt(match[3])
        
        // Handle 2-digit years
        if (year < 100) {
          year += year < 50 ? 2000 : 1900
        }
      }
      
      const date = new Date(year, month, day)
      if (!isNaN(date.getTime()) && 
          date.getFullYear() >= 2000 && 
          date.getFullYear() <= new Date().getFullYear() + 1) {
        return date
      }
    }
  }
  
  return null
}

function extractItems(lines: string[]): string[] {
  const items: string[] = []
  
  for (const line of lines) {
    // Look for lines that might be items (contain text and a price pattern)
    if (line.match(/.*\$?\d+\.\d{2}/) && 
        line.length > 5 && 
        !line.toLowerCase().includes('total') &&
        !line.toLowerCase().includes('tax') &&
        !line.toLowerCase().includes('change') &&
        !line.toLowerCase().includes('cash') &&
        !line.toLowerCase().includes('card')) {
      
      // Clean up the item line
      const cleanItem = line.replace(/\$?\d+\.\d{2}.*$/, '').trim()
      if (cleanItem.length > 2 && cleanItem.length < 50) {
        items.push(cleanItem)
      }
    }
  }
  
  return items.slice(0, 10) // Limit to 10 items max
}

function suggestCategory(merchantName: string, text: string): string | undefined {
  const lowerMerchant = merchantName.toLowerCase()
  const lowerText = text.toLowerCase()
  
  // Check merchant name first
  for (const [keyword, category] of Object.entries(MERCHANT_CATEGORIES)) {
    if (lowerMerchant.includes(keyword) || lowerText.includes(keyword)) {
      return category
    }
  }
  
  // Additional text-based category suggestions
  if (lowerText.includes('grocery') || lowerText.includes('food') || lowerText.includes('produce')) {
    return 'Food & Groceries'
  }
  
  if (lowerText.includes('gas') || lowerText.includes('fuel') || lowerText.includes('gallon')) {
    return 'Transportation'
  }
  
  if (lowerText.includes('medical') || lowerText.includes('pharmacy') || lowerText.includes('prescription')) {
    return 'Health & Medical'
  }
  
  if (lowerText.includes('restaurant') || lowerText.includes('dining') || lowerText.includes('menu')) {
    return 'Food & Dining'
  }
  
  return undefined
}

// Image processing utilities
export function compressImage(file: File, maxWidth: number = 1024, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img
      if (width > maxWidth) {
        height = (height * maxWidth) / width
        width = maxWidth
      }
      
      canvas.width = width
      canvas.height = height
      
      // Draw and compress
      ctx?.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            })
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        },
        'image/jpeg',
        quality
      )
    }
    
    img.src = URL.createObjectURL(file)
  })
}