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
    // Get initial session
    const getSession = async () => {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      
      if (supabaseSession?.user) {
        try {
          const profile = await getProfile(supabaseSession.user.id)
          setSession({
            user: {
              id: supabaseSession.user.id,
              email: supabaseSession.user.email || '',
              role: profile.role,
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
                role: profile.role,
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
      subscription.unsubscribe()
    }
  }, [])

  return session
}

async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single<Profile>()

  if (error) throw error
  return data
}