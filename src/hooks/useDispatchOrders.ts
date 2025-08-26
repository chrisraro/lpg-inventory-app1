import { useState, useEffect } from 'react'
import { supabase, DispatchOrder } from '@/utils/supabaseClient'
import { 
  getDispatchOrders, 
  getDispatchOrder, 
  createDispatchOrder, 
  updateDispatchOrder, 
  addCylinderToOrder, 
  removeCylinderFromOrder,
  getCylindersInOrder
} from '@/utils/dispatchHelpers'

export function useDispatchOrders() {
  const [orders, setOrders] = useState<DispatchOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()

    // Set up real-time subscription
    const channel = supabase
      .channel('dispatch-orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dispatch_orders',
        },
        (payload) => {
          setOrders((prev) => [payload.new as DispatchOrder, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dispatch_orders',
        },
        (payload) => {
          setOrders((prev) =>
            prev.map((order) =>
              order.id === payload.new.id ? (payload.new as DispatchOrder) : order
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'dispatch_orders',
        },
        (payload) => {
          setOrders((prev) => prev.filter((order) => order.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchOrders() {
    try {
      setLoading(true)
      const data = await getDispatchOrders()
      setOrders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dispatch orders')
    } finally {
      setLoading(false)
    }
  }

  return { orders, loading, error, refetch: fetchOrders }
}

export function useDispatchOrder(id: number) {
  const [order, setOrder] = useState<DispatchOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrder()

    // Set up real-time subscription for this specific order
    const channel = supabase
      .channel(`dispatch-order-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'dispatch_orders',
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setOrder(payload.new as DispatchOrder)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  async function fetchOrder() {
    try {
      setLoading(true)
      const data = await getDispatchOrder(id)
      setOrder(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dispatch order')
    } finally {
      setLoading(false)
    }
  }

  return { order, loading, error, refetch: fetchOrder }
}