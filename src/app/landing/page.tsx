'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  ArrowRight, 
  BarChart3, 
  Users, 
  Shield, 
  Smartphone, 
  IndianRupee,
  TrendingUp,
  PieChart,
  Receipt,
  CheckCircle,
  Star,
  Mail,
  Phone,
  MapPin,
  Menu,
  X
} from 'lucide-react'
import LoadingSpinner from '@/components/LoadingSpinner'
import '@/styles/landing.css'

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false)
      setSubmitStatus('success')
      setContactForm({ name: '', email: '', message: '' })
      
      // Reset status after 3 seconds
      setTimeout(() => setSubmitStatus('idle'), 3000)
    }, 1500)
  }

  const features = [
    {
      icon: BarChart3,
      title: "Smart Analytics",
      description: "Get detailed insights into your spending patterns with interactive charts and reports that help you make informed financial decisions."
    },
    {
      icon: Users,
      title: "Group Expenses",
      description: "Split bills and track shared expenses with friends, family, or roommates effortlessly. No more awkward money conversations."
    },
    {
      icon: Receipt,
      title: "Expense Tracking",
      description: "Track all your expenses and income across multiple accounts and categories with automated categorization and receipt scanning."
    },
    {
      icon: PieChart,
      title: "Budget Management",
      description: "Set intelligent budgets for different categories and get proactive alerts when you're approaching your limits."
    },
    {
      icon: TrendingUp,
      title: "Financial Goals",
      description: "Set and track your financial goals with visual progress indicators and personalized recommendations."
    },
    {
      icon: Shield,
      title: "Secure & Private", 
      description: "Your financial data is encrypted with bank-level security and never shared with third parties. Your privacy is our priority."
    }
  ]

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Freelancer",
      content: "Fina has completely transformed how I manage my finances. The analytics are incredible and help me make better spending decisions every day.",
      rating: 5
    },
    {
      name: "Mike Chen", 
      role: "Small Business Owner",
      content: "The group expense feature is a game-changer for our team. Managing business trips and team dinners has never been easier!",
      rating: 5
    },
    {
      name: "Emily Rodriguez",
      role: "College Student", 
      content: "As a student on a tight budget, Fina helps me track every penny. The budget alerts have saved me from overspending countless times.",
      rating: 5
    }
  ]

  const faqs = [
    {
      question: "Is Fina free to use?",
      answer: "Yes, Fina offers a comprehensive free plan with all essential features. We also offer premium plans with advanced analytics and unlimited group expenses for power users."
    },
    {
      question: "How secure is my financial data?",
      answer: "We use bank-level security with 256-bit SSL encryption. Your data is never shared with third parties and is stored securely in compliance with financial regulations including PCI DSS."
    },
    {
      question: "Can I connect my bank accounts?",
      answer: "Yes, Fina supports secure bank account connections through industry-standard APIs, allowing for automatic transaction imports and real-time balance updates from over 10,000 financial institutions."
    },
    {
      question: "Does Fina work on mobile devices?",
      answer: "Absolutely! Fina is fully responsive and works seamlessly on all devices - desktop, tablet, and mobile. We also have dedicated mobile apps available on iOS and Android."
    },
    {
      question: "How does group expense splitting work?",
      answer: "Simply create a group, add members via email or phone, and start logging shared expenses. Fina automatically calculates who owes what and provides easy settlement tracking with payment reminders."
    },
    {
      question: "Can I export my financial data?",
      answer: "Yes, you can export your data in various formats including CSV, PDF, and Excel for reports, tax purposes, or to migrate to other platforms. You own your data completely."
    }
  ]

  return (
    <div className="min-h-screen bg-white landing-page">
      {/* Navigation */}
      <nav className="bg-white shadow-lg border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <IndianRupee className="h-8 w-8" style={{color: '#00897B'}} />
              <span className="ml-2 text-xl font-bold" style={{color: '#212121'}}>Fina</span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <a href="#features" className="px-3 py-2 text-sm font-medium transition-colors hover:text-opacity-80" style={{color: '#424242'}}>
                  Features
                </a>
                <a href="#testimonials" className="px-3 py-2 text-sm font-medium transition-colors hover:text-opacity-80" style={{color: '#424242'}}>
                  Testimonials
                </a>
                <a href="#faq" className="px-3 py-2 text-sm font-medium transition-colors hover:text-opacity-80" style={{color: '#424242'}}>
                  FAQ
                </a>
                <a href="#contact" className="px-3 py-2 text-sm font-medium transition-colors hover:text-opacity-80" style={{color: '#424242'}}>
                  Contact
                </a>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="ml-4 flex items-center md:ml-6 space-x-4">
                <Link href="/auth/signin" className="px-3 py-2 text-sm font-medium transition-colors hover:text-opacity-80" style={{color: '#424242'}}>
                  Sign In
                </Link>
                <Link 
                  href="/auth/signup" 
                  className="px-4 py-2 rounded-md text-sm font-medium text-white transition-all hover:shadow-lg hover:scale-105"
                  style={{backgroundColor: '#82B1FF'}}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6FA8FF'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#82B1FF'}
                >
                  Get Started
                </Link>
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 transition-colors"
                style={{color: '#757575'}}
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-100">
              <a href="#features" className="block px-3 py-2 text-base font-medium" style={{color: '#424242'}}>
                Features
              </a>
              <a href="#testimonials" className="block px-3 py-2 text-base font-medium" style={{color: '#424242'}}>
                Testimonials  
              </a>
              <a href="#faq" className="block px-3 py-2 text-base font-medium" style={{color: '#424242'}}>
                FAQ
              </a>
              <a href="#contact" className="block px-3 py-2 text-base font-medium" style={{color: '#424242'}}>
                Contact
              </a>
              <div className="pt-4 pb-3 border-t border-gray-100">
                <div className="flex items-center px-3 space-x-3">
                  <Link href="/auth/signin" className="block px-3 py-2 text-base font-medium" style={{color: '#424242'}}>
                    Sign In
                  </Link>
                  <Link 
                    href="/auth/signup" 
                    className="px-4 py-2 rounded-md text-sm font-medium text-white"
                    style={{backgroundColor: '#82B1FF'}}
                  >
                    Get Started
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="hero-gradient py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-center">
            <div className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight" style={{color: '#212121'}}>
                Take Control of Your
                <span className="block" style={{color: '#00897B'}}>Financial Future</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl max-w-3xl" style={{color: '#424242'}}>
                Fina is the smart financial companion that helps you track expenses, manage budgets, 
                split bills with friends, and gain powerful insights into your spending habits with beautiful analytics.
              </p>
              <div className="mt-8 sm:max-w-lg sm:mx-auto sm:text-center lg:text-left lg:mx-0">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link 
                    href="/auth/signup"
                    className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white transition-all hover:shadow-lg hover:scale-105 float-animation"
                    style={{backgroundColor: '#00897B'}}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00796B'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00897B'}
                  >
                    Start Free Today
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                  <Link
                    href="#features"
                    className="inline-flex items-center justify-center px-8 py-3 border text-base font-medium rounded-md transition-all hover:shadow-md"
                    style={{borderColor: '#BDBDBD', color: '#424242'}}
                  >
                    Learn More
                  </Link>
                </div>
              </div>
            </div>
            <div className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center">
              <div className="relative mx-auto w-full rounded-lg shadow-2xl lg:max-w-md float-animation">
                {/* Dashboard Preview */}
                <div className="bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 teal-gradient">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      </div>
                      <div className="text-white text-sm font-medium">Fina Dashboard</div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold" style={{color: '#212121'}}>Monthly Overview</h3>
                      <span className="text-sm font-medium" style={{color: '#4CAF50'}}>+12.5%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg" style={{backgroundColor: '#E8F5E8'}}>
                        <div className="text-xs" style={{color: '#757575'}}>Income</div>
                        <div className="text-lg font-semibold" style={{color: '#4CAF50'}}>₹4,25,000</div>
                      </div>
                      <div className="p-3 rounded-lg" style={{backgroundColor: '#FFEBEE'}}>
                        <div className="text-xs" style={{color: '#757575'}}>Expenses</div>
                        <div className="text-lg font-semibold" style={{color: '#F44336'}}>₹3,18,000</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span style={{color: '#757575'}}>Food & Dining</span>
                          <span style={{color: '#212121'}}>₹68,000</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{width: '45%', backgroundColor: '#00897B'}}></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span style={{color: '#757575'}}>Transportation</span>
                          <span style={{color: '#212121'}}>₹42,000</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{width: '28%', backgroundColor: '#82B1FF'}}></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span style={{color: '#757575'}}>Entertainment</span>
                          <span style={{color: '#212121'}}>₹28,000</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{width: '19%', backgroundColor: '#FF9800'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold" style={{color: '#212121'}}>
              Everything You Need to Manage Your Finances
            </h2>
            <p className="mt-4 text-lg max-w-2xl mx-auto" style={{color: '#424242'}}>
              Powerful features designed to make financial management simple, intuitive, and effective.
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-lg border border-gray-100 feature-card">
                <div className="flex items-center justify-center w-12 h-12 rounded-md mb-4" style={{backgroundColor: '#E0F2F1'}}>
                  <feature.icon className="h-6 w-6" style={{color: '#00897B'}} />
                </div>
                <h3 className="text-xl font-semibold mb-2" style={{color: '#212121'}}>{feature.title}</h3>
                <p style={{color: '#424242'}}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20" style={{backgroundColor: '#F5F5F5'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold" style={{color: '#212121'}}>
              Loved by Thousands of Users
            </h2>
            <p className="mt-4 text-lg" style={{color: '#424242'}}>
              See what our users have to say about their experience with Fina.
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-lg border border-gray-100 testimonial-card">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="mb-4 italic" style={{color: '#424242'}}>"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold" style={{color: '#212121'}}>{testimonial.name}</div>
                  <div className="text-sm" style={{color: '#757575'}}>{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold" style={{color: '#212121'}}>
              Frequently Asked Questions
            </h2>
            <p className="mt-4 text-lg" style={{color: '#424242'}}>
              Got questions? We've got answers.
            </p>
          </div>
          
          <div className="mt-16 space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white rounded-lg p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                <h3 className="text-lg font-semibold mb-2" style={{color: '#212121'}}>{faq.question}</h3>
                <p style={{color: '#424242'}}>{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20" style={{backgroundColor: '#F5F5F5'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold" style={{color: '#212121'}}>
              Get in Touch
            </h2>
            <p className="mt-4 text-lg" style={{color: '#424242'}}>
              Have questions or need support? We'd love to hear from you.
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <div>
              <h3 className="text-xl font-semibold mb-6" style={{color: '#212121'}}>Contact Information</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-3" style={{color: '#00897B'}} />
                  <span style={{color: '#424242'}}>support@fina-app.com</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-3" style={{color: '#00897B'}} />
                  <span style={{color: '#424242'}}>+1 (555) 123-4567</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 mr-3" style={{color: '#00897B'}} />
                  <span style={{color: '#424242'}}>123 Finance Street, Money City, FC 12345</span>
                </div>
              </div>
            </div>
            
            {/* Contact Form */}
            <div>
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1" style={{color: '#424242'}}>
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{color: '#212121', '--tw-ring-color': '#00897B'} as any}
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1" style={{color: '#424242'}}>
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{color: '#212121', '--tw-ring-color': '#00897B'} as any}
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-1" style={{color: '#424242'}}>
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{color: '#212121', '--tw-ring-color': '#00897B'} as any}
                    placeholder="How can we help you?"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 rounded-md font-medium text-white transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{backgroundColor: isSubmitting ? '#BDBDBD' : '#00897B'}}
                  onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#00796B')}
                  onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#00897B')}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" className="mr-2" />
                      Sending...
                    </div>
                  ) : (
                    'Send Message'
                  )}
                </button>
                {submitStatus === 'success' && (
                  <div className="flex items-center text-sm" style={{color: '#4CAF50'}}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Message sent successfully! We'll get back to you soon.
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12" style={{backgroundColor: '#212121', color: '#FFFFFF'}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center">
                <IndianRupee className="h-8 w-8" style={{color: '#00897B'}} />
                <span className="ml-2 text-xl font-bold">Fina</span>
              </div>
              <p className="mt-4 max-w-md" style={{color: '#BDBDBD'}}>
                Your smart financial companion for tracking expenses, managing budgets, and achieving your financial goals with confidence.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{color: '#00897B'}}>Product</h3>
              <ul className="mt-4 space-y-2">
                <li><a href="#features" className="transition-colors hover:text-white" style={{color: '#BDBDBD'}}>Features</a></li>
                <li><a href="#" className="transition-colors hover:text-white" style={{color: '#BDBDBD'}}>Pricing</a></li>
                <li><a href="#" className="transition-colors hover:text-white" style={{color: '#BDBDBD'}}>Security</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{color: '#00897B'}}>Support</h3>
              <ul className="mt-4 space-y-2">
                <li><a href="#contact" className="transition-colors hover:text-white" style={{color: '#BDBDBD'}}>Contact</a></li>
                <li><a href="#faq" className="transition-colors hover:text-white" style={{color: '#BDBDBD'}}>FAQ</a></li>
                <li><a href="#" className="transition-colors hover:text-white" style={{color: '#BDBDBD'}}>Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t" style={{borderColor: '#424242'}}>
            <p className="text-center" style={{color: '#757575'}}>
              © 2024 Fina. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}