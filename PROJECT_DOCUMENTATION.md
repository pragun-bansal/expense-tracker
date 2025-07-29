# 💰 Personal Finance & Group Expense Tracker

A comprehensive full-stack expense management application built with modern web technologies. This project demonstrates advanced skills in building scalable, production-ready applications with complex business logic, real-time features, and comprehensive user management.

## 🌟 Project Overview

This is a sophisticated personal finance and group expense management platform that enables users to track individual expenses, manage shared group expenses, set budgets, receive intelligent notifications, and gain insights through analytics. The application showcases expertise in building complex financial software with multi-user collaboration features.

## 🚀 Key Features

### 💳 Personal Finance Management
- **Multi-Account Support**: Track expenses across various account types (Cash, Bank, Credit Card, Investment, Other)
- **Expense & Income Tracking**: Comprehensive transaction management with categories, descriptions, and receipt uploads
- **Budget Management**: Set weekly, monthly, or yearly budgets with intelligent overspending alerts
- **Recurring Expenses**: Automated handling of recurring payments (daily, weekly, monthly, yearly)
- **Account Transfers**: Internal transfers between user accounts with balance synchronization
- **Analytics Dashboard**: Visual insights into spending patterns and financial health

### 👥 Group Expense Management (Splitwise-like Features)
- **Group Creation & Management**: Create expense groups for shared costs (roommates, trips, etc.)
- **Bill Splitting**: Split expenses equally or proportionally among group members
- **Settlement Tracking**: Track who owes whom and manage debt settlements
- **Group Activity Logs**: Comprehensive audit trail of all group activities
- **Member Management**: Add/remove members, assign admin roles, and manage permissions
- **Real-time Balance Calculations**: Automatic calculation of group balances and outstanding debts

### 🔔 Advanced Notification System
- **Multi-Channel Notifications**: Toast notifications, in-app notifications, and email alerts
- **Smart Budget Alerts**: Automatic warnings at 80% and alerts at 100% budget usage
- **Group Activity Notifications**: Real-time updates for group expenses and settlements
- **Intelligent Spam Prevention**: 24-hour cooldowns and duplicate detection
- **Rich Notification Metadata**: Contextual information with direct action links

### 📊 Analytics & Reporting
- **Interactive Dashboard**: Real-time financial overview with key metrics
- **Spending Analytics**: Category-wise analysis and trend visualization
- **Group Reports**: Detailed expense reports for group activities
- **Export Functionality**: Data export capabilities for external analysis
- **Historical Tracking**: Long-term financial trend analysis

### 🌍 Multi-Currency Support
- **43+ Currencies**: Support for major global currencies with real-time exchange rates
- **Currency Conversion**: Automatic conversion for international transactions
- **Localized Formatting**: Region-specific number and currency formatting

### 🔐 Security & Authentication
- **NextAuth.js Integration**: Secure authentication with multiple providers
- **Role-Based Access Control**: User roles and permissions for group management
- **Data Validation**: Comprehensive input validation and sanitization
- **Secure File Uploads**: Protected receipt and document upload functionality

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15.4.1 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0 with custom theming (Light/Dark/Soft themes)
- **UI Components**: Custom component library with Lucide React icons
- **State Management**: React hooks with context API
- **Forms**: Custom form handling with validation
- **Charts**: Recharts for data visualization

### Backend
- **Framework**: Next.js API Routes (Full-stack)
- **Authentication**: NextAuth.js v4.24.11 with Prisma adapter
- **Database**: MongoDB with Prisma ORM 6.12.0
- **File Upload**: Multer for receipt and document handling
- **Email**: Nodemailer for notification delivery
- **OCR**: Tesseract.js for receipt text extraction

### Database & Schema
- **Database**: MongoDB (NoSQL)
- **ORM**: Prisma with comprehensive schema design
- **Models**: 15+ interconnected models for complex relationships
- **Data Integrity**: Foreign key constraints and cascade deletions
- **Indexing**: Optimized queries with proper indexing

### DevOps & Deployment
- **Package Manager**: pnpm for efficient dependency management
- **Linting**: ESLint with Next.js configuration
- **Type Checking**: TypeScript with strict configuration
- **Build System**: Next.js with Turbopack for fast development
- **Deployment**: Vercel-ready with environment configuration

## 📁 Project Structure

```
claude/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Main dashboard
│   │   ├── expenses/           # Expense management
│   │   ├── groups/             # Group expense features
│   │   ├── accounts/           # Account management
│   │   ├── budgets/            # Budget tracking
│   │   ├── analytics/          # Data analysis
│   │   ├── notifications/      # Notification center
│   │   └── api/               # Backend API routes
│   ├── components/            # Reusable UI components
│   ├── lib/                   # Utility functions and services
│   ├── hooks/                 # Custom React hooks
│   ├── contexts/              # React context providers
│   └── types/                 # TypeScript type definitions
├── prisma/                    # Database schema and migrations
└── public/                    # Static assets
```

## 🔧 Advanced Features Implementation

### Real-time Notifications
- **Toast System**: Context-based toast notifications with priority queuing
- **Polling Mechanism**: 30-second intervals for real-time updates
- **Smart Deduplication**: Prevents notification spam with intelligent filtering

### Complex Business Logic
- **Group Balance Calculations**: Multi-user debt calculation algorithms
- **Settlement Logic**: Automated debt resolution and payment tracking
- **Budget Monitoring**: Real-time budget usage tracking with threshold alerts
- **Recurring Expense Processing**: Automated creation of recurring transactions

### Performance Optimizations
- **Database Optimization**: Efficient queries with proper indexing
- **Component Optimization**: Memoization and lazy loading
- **Image Optimization**: Next.js Image component for receipt uploads
- **Bundle Optimization**: Tree shaking and code splitting

## 📈 Resume Value Proposition

### Technical Skills Demonstrated
1. **Full-Stack Development**: Complete CRUD operations with complex business logic
2. **Database Design**: Sophisticated schema with 15+ interconnected models
3. **Real-time Features**: WebSocket-like functionality with polling mechanisms
4. **Authentication & Authorization**: Secure user management with role-based access
5. **API Design**: RESTful API design with proper error handling
6. **TypeScript Proficiency**: Comprehensive type safety across the entire stack
7. **Modern React Patterns**: Hooks, Context API, and advanced component patterns

### Business Logic Complexity
1. **Financial Calculations**: Multi-currency, multi-user expense splitting algorithms
2. **Notification Systems**: Multi-channel communication with smart filtering
3. **User Management**: Complex role-based permissions and group dynamics
4. **Data Analytics**: Financial trend analysis and reporting capabilities
5. **Automated Processes**: Recurring transactions and budget monitoring

### Production-Ready Features
1. **Error Handling**: Comprehensive error management and user feedback
2. **Data Validation**: Input sanitization and business rule enforcement
3. **Security Measures**: Authentication, authorization, and data protection
4. **Performance**: Optimized queries and efficient data loading
5. **User Experience**: Responsive design with accessibility considerations

### Industry-Relevant Problem Solving
1. **FinTech Experience**: Building financial software with complex calculations
2. **Collaborative Features**: Multi-user applications with real-time updates
3. **Data Management**: Large-scale data handling with relationships
4. **Integration Skills**: Third-party services and API integrations
5. **Scalability**: Architecture designed for growth and performance

## 🎯 Key Achievements

- ✅ **Multi-Currency Support**: 43+ currencies with real-time conversion
- ✅ **Group Expense Splitting**: Complex bill-splitting algorithms
- ✅ **Real-time Notifications**: Multi-channel notification system
- ✅ **Advanced Analytics**: Interactive charts and financial insights
- ✅ **Recurring Payments**: Automated expense management
- ✅ **Receipt OCR**: Text extraction from uploaded receipts
- ✅ **Theme System**: Multiple UI themes with smooth transitions
- ✅ **Mobile Responsive**: Fully responsive design across all devices

## 🚀 Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run database migrations
pnpm prisma generate
pnpm prisma db push

# Start development server
pnpm dev
```

## 📊 Technical Metrics

- **Lines of Code**: 10,000+ (TypeScript/JavaScript)
- **Database Models**: 15+ interconnected models
- **API Endpoints**: 30+ RESTful routes
- **UI Components**: 20+ reusable components
- **Features**: 25+ major features implemented
- **Dependencies**: 30+ carefully selected packages

---

This project demonstrates comprehensive full-stack development skills, complex business logic implementation, and production-ready software engineering practices. It showcases the ability to build sophisticated financial applications with modern technologies and advanced features that solve real-world problems.