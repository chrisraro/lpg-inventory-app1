import { useEffect, useState } from 'react'
import { supabase, Profile } from '@/utils/supabaseClient'

export interface AuthSession {
  user: {
    id: string
    email: string
    role: string
  } | null
  profile: Profile | null
  loading: boolean
}

export function useAuth() {
  const [session, setSession] = useState<AuthSession>({
    user: null,
    profile: null,
    loading: true,
  })

  useEffect(() => {
    // If supabase client is not initialized, set loading to false
    if (!supabase) {
      setSession({
        user: null,
        profile: null,
        loading: false,
      })
      return
    }

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        
        if (supabaseSession?.user) {
          try {
            const profile = await getProfile(supabaseSession.user.id)
            setSession({
              user: {
                id: supabaseSession.user.id,
                email: supabaseSession.user.email || '',
                role: profile?.role || 'delivery', // default role
              },
              profile,
              loading: false,
            })
          } catch (error) {
            console.error('Error fetching profile:', error)
            setSession({
              user: {
                id: supabaseSession.user.id,
                email: supabaseSession.user.email || '',
                role: 'delivery', // default role
              },
              profile: null,
              loading: false,
            })
          }
        } else {
          setSession({
            user: null,
            profile: null,
            loading: false,
          })
        }
      } catch (error) {
        console.error('Error getting session:', error)
        setSession({
          user: null,
          profile: null,
          loading: false,
        })
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      if (supabaseSession?.user) {
        getProfile(supabaseSession.user.id)
          .then(profile => {
            setSession({
              user: {
                id: supabaseSession.user.id,
                email: supabaseSession.user.email || '',
                role: profile?.role || 'delivery',
              },
              profile,
              loading: false,
            })
          })
          .catch(error => {
            console.error('Error fetching profile:', error)
            setSession({
              user: {
                id: supabaseSession.user.id,
                email: supabaseSession.user.email || '',
                role: 'delivery', // default role
              },
              profile: null,
              loading: false,
            })
          })
      } else {
        setSession({
          user: null,
          profile: null,
          loading: false,
        })
      }
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  return session
}

async function getProfile(userId: string) {
  // If supabase client is not initialized, return null
  if (!supabase) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single<Profile>()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }
  
  return data
}