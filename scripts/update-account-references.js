const fs = require('fs')
const path = require('path')

function updateFileContent(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let updated = false
    
    // Replace prisma.account with prisma.userAccount
    if (content.includes('prisma.account')) {
      content = content.replace(/prisma\.account/g, 'prisma.userAccount')
      updated = true
    }
    
    // Replace Account type references with UserAccount (but not NextAuth Account)
    // This is more careful - only replace in specific contexts
    content = content.replace(/Account\[\]/g, 'UserAccount[]')
    content = content.replace(/Account\s*\|/g, 'UserAccount |')
    content = content.replace(/:\s*Account\s*=/g, ': UserAccount =')
    content = content.replace(/:\s*Account\s*\{/g, ': UserAccount {')
    content = content.replace(/:\s*Account\s*\)/g, ': UserAccount)')
    content = content.replace(/\(\s*Account\s*\)/g, '(UserAccount)')
    
    if (updated) {
      fs.writeFileSync(filePath, content)
      console.log(`Updated: ${filePath}`)
    }
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error.message)
  }
}

function updateDirectory(dirPath) {
  const items = fs.readdirSync(dirPath)
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item)
    const stat = fs.statSync(fullPath)
    
    if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
      updateDirectory(fullPath)
    } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
      updateFileContent(fullPath)
    }
  }
}

console.log('Updating Account references to UserAccount...')
updateDirectory('./src')
console.log('Update completed!')