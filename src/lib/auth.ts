import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { createDefaultAccounts } from './userSetup'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    pkceCodeVerifier: {
      name: "next-auth.pkce.code_verifier",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: false, // Set to true in production with HTTPS
      },
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      }
    })
  ],
  session: {
    strategy: 'database'
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup'
  },
  callbacks: {
    async session({ session, user }) {
      console.log('Session callback - session:', session)
      console.log('Session callback - user:', user)
      if (user) {
        session.user.id = user.id
      }
      return session
    },
    async signIn({ user, account, profile }) {
      console.log('SignIn callback - user:', user)
      console.log('SignIn callback - account:', account)
      console.log('SignIn callback - profile:', profile)
      
      // For OAuth users, ensure they have the default accounts set up
      if (account?.provider === 'google' && user?.id) {
        try {
          // Check if user already has accounts
          const existingAccounts = await prisma.userAccount.findMany({
            where: { userId: user.id }
          })
          
          if (existingAccounts.length === 0) {
            console.log('Creating default accounts for new OAuth user:', user.id)
            await createDefaultAccounts(user.id)
          }
        } catch (error) {
          console.error('Error setting up OAuth user accounts:', error)
        }
      }
      
      return true
    }
  },
  debug: process.env.NODE_ENV === 'development'
}