'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase, Profile, DispatchOrder } from '@/utils/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

export default function AssignDeliveryPerson({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const [deliveryPersonnel, setDeliveryPersonnel] = useState<Profile[]>([])
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState<string | null>(null)
  const [order, setOrder] = useState<DispatchOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Fetch delivery personnel and order details
  useEffect(() => {
    Promise.all([
      fetchDeliveryPersonnel(),
      fetchOrder()
    ]).finally(() => setLoading(false))
  }, [params.id])

  async function fetchDeliveryPersonnel() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'delivery')
        .order('full_name')

      if (error) throw error
      setDeliveryPersonnel(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch delivery personnel')
    }
  }

  async function fetchOrder() {
    try {
      const { data, error } = await supabase
        .from('dispatch_orders')
        .select('*')
        .eq('id', params.id)
        .single<DispatchOrder>()

      if (error) throw error
      if (!data) throw new Error('Order not found')
      
      setOrder(data)
      setSelectedDeliveryPerson(data.delivery_person_id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdating(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('dispatch_orders')
        .update({ delivery_person_id: selectedDeliveryPerson || null })
        .eq('id', params.id)

      if (error) throw error

      router.push(`/dispatch/${params.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign delivery person')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <ProtectedRoute requiredRole="warehouse">
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold text-gray-900">Assign Delivery Person</h1>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-red-500">Error: {error}</div>
              <button
                onClick={() => router.push(`/dispatch/${params.id}`)}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Order
              </button>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  if (!order) {
    return (
      <ProtectedRoute requiredRole="warehouse">
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold text-gray-900">Assign Delivery Person</h1>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-gray-500">Order not found</div>
              <button
                onClick={() => router.push('/dispatch')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Back to Orders
              </button>
            </div>
          </main>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRole="warehouse">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Assign Delivery Person</h1>
            <button
              onClick={() => router.push(`/dispatch/${params.id}`)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Order
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6 max-w-2xl mx-auto">
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900">Order #{order.id}</h2>
              <p className="text-sm text-gray-500">Select a delivery person to assign to this order</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="deliveryPerson" className="block text-sm font-medium text-gray-700">
                  Delivery Person
                </label>
                <div className="mt-1">
                  <select
                    id="deliveryPerson"
                    value={selectedDeliveryPerson || ''}
                    onChange={(e) => setSelectedDeliveryPerson(e.target.value || null)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Unassigned</option>
                    {deliveryPersonnel.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.push(`/dispatch/${params.id}`)}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {updating ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Assigning...
                    </>
                  ) : (
                    'Assign Delivery Person'
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}