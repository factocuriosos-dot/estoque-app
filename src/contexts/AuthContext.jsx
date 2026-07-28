import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  async function carregarPerfil(userId) {
    if (!userId) {
      setPerfil(null)
      return
    }
    const { data } = await supabase
      .from('usuarios_perfil')
      .select('*')
      .eq('user_id', userId)
      .single()
    setPerfil(data || null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null)
      await carregarPerfil(session?.user?.id)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      await carregarPerfil(session?.user?.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setPerfil(null)
  }

  const isAdmin = perfil?.perfil === 'admin'

  return (
    <AuthContext.Provider
      value={{ user, perfil, loading, signIn, signOut, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
