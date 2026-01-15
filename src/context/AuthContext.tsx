import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/config/supabase'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  session: Session | null
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsAuthenticated(!!session)
      setIsLoading(false)
    }).catch((err) => {
      console.warn('Auth check failed:', err)
      setIsLoading(false)
    })

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setIsAuthenticated(!!session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.session) {
        setSession(data.session)
        setUser(data.user)
        setIsAuthenticated(true)
        return { success: true }
      }

      return { success: false, error: 'Login failed' }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Connection error' }
    }
  }

  const signup = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      // If email confirmation is disabled, user will be signed in automatically
      if (data.session) {
        setSession(data.session)
        setUser(data.user)
        setIsAuthenticated(true)
        return { success: true }
      }

      // If email confirmation is required
      if (data.user && !data.session) {
        return { success: true, error: 'Please check your email to confirm your account' }
      }

      return { success: false, error: 'Signup failed' }
    } catch (error) {
      console.error('Signup error:', error)
      return { success: false, error: 'Connection error' }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setIsAuthenticated(false)
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      user,
      session,
      login,
      signup,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}
