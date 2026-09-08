import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabaseClient'

type AuthState = {
  session: Session | null
  /** true, пока идёт самая первая проверка (есть ли уже сохранённая сессия). */
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState>({ session: null, loading: false, signOut: async () => {} })

/**
 * Тонкая обёртка над supabase.auth: держит текущую сессию врача в контексте,
 * чтобы AuthGate (см. App.tsx) и SettingsPage не лазили в supabase.auth
 * напрямую. Без настроенного Supabase (isSupabaseConfigured === false)
 * ничего не делает — session всегда null, loading сразу false, приложение
 * работает как раньше, без экрана входа.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => subscription.subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
  }

  return <AuthContext.Provider value={{ session, loading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
