import { useEffect, useState } from 'react'
import { supabase, Cylinder } from '@/utils/supabaseClient'

export function useCylinders() {
  const [cylinders, setCylinders] = useState<Cylinder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initial fetch
    fetchCylinders()

    // Set up real-time subscription
    const channel = supabase
      .channel('cylinders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cylinders',
        },
        (payload) => {
          setCylinders((prev) => [payload.new as Cylinder, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'cylinders',
        },
        (payload) => {
          setCylinders((prev) =>
            prev.map((cylinder) =>
              cylinder.id === payload.new.id ? (payload.new as Cylinder) : cylinder
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'cylinders',
        },
        (payload) => {
          setCylinders((prev) => prev.filter((cylinder) => cylinder.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchCylinders() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cylinders')
        .select(`
          *,
          cylinder_types(name, weight, capacity),
          customers(name, address)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setCylinders(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching cylinders:', err)
    } finally {
      setLoading(false)
    }
  }

  return { cylinders, loading, error, refetch: fetchCylinders }
}