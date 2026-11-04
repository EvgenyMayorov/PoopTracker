import { useState, useEffect } from 'react'
import { supabase, Profile } from './lib/supabase'
import { AuthScreen } from './components/AuthScreen'
import { MainScreen } from './components/MainScreen'

function App() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
    } else if (data) {
      setProfile(data)
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const handleAuth = () => {
    // Auth state change will be handled by the listener
    if (session?.user) {
      fetchProfile(session.user.id)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">💩</div>
          <p className="text-cyan-400 text-lg">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!session || !profile) {
    return <AuthScreen onAuth={handleAuth} />
  }

  return <MainScreen profile={profile} onLogout={handleLogout} />
}

export default App
