'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase, DispatchOrder, Cylinder, Customer, Profile } from '@/utils/supabaseClient'
import { useAuth } from '@/hooks/useAuth'

export default function DispatchOrderDetail({ params }: { params: { id: string } }) {
  const { user } = useAuth()
  const router = useRouter()
  const [order, setOrder] = useState<DispatchOrder | null>(null)
  const [cylinders, setCylinders] = useState<Cylinder[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [deliveryPerson, setDeliveryPerson] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch dispatch order details
  useEffect(() => {
    fetchOrderDetails()
  }, [params.id])

  async function fetchOrderDetails() {
    try {
      setLoading(true)
      
      // Fetch the order
      const { data: orderData, error: orderError } = await supabase
        .from('dispatch_orders')
        .select(`
          *,
          customers(name, address, phone),
          profiles(full_name)
        `)
        .eq('id', params.id)
        .single<DispatchOrder>()

      if (orderError) throw orderError
      if (!orderData) throw new Error('Order not found')
      
      setOrder(orderData)
      setCustomer((orderData as any).customers)
      setDeliveryPerson((orderData as any).profiles)

      // Fetch cylinders in the order
      const { data: itemsData, error: itemsError } = await supabase
        .from('dispatch_order_items')
        .select('cylinder_id')
        .eq('dispatch_order_id', params.id)

      if (itemsError) throw itemsError

      if (itemsData && itemsData.length > 0) {
        const cylinderIds = itemsData.map(item => item.cylinder_id)
        const { data: cylindersData, error: cylindersError } = await supabase
          .from('cylinders')
          .select(`
            *,
            cylinder_types(name, weight, capacity)
          `)
          .in('id', cylinderIds)

        if (cylindersError) throw cylindersError
        setCylinders(cylindersData || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch order details')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    if (!order) return

    setUpdating(true)
    setError(null)

    try {
      // Update order status
      const { error: updateError } = await supabase
        .from('dispatch_orders')
        .update({ 
          status: newStatus,
          [newStatus === 'dispatched' ? 'dispatched_at' : 
           newStatus === 'delivered' ? 'delivered_at' : 
           newStatus === 'returned' ? 'returned_at' : '']: new Date().toISOString()
        })
        .eq('id', order.id)

      if (updateError) throw updateError

      // If delivering or returning, update cylinder statuses
      if (newStatus === 'delivered' || newStatus === 'returned') {
        const cylinderIds = cylinders.map(c => c.id)
        const { error: cylinderError } = await supabase
          .from('cylinders')
          .update({ 
            status: newStatus === 'delivered' ? 'delivered' : 'in_stock',
            current_customer_id: newStatus === 'delivered' ? order.customer_id : null
          })
          .in('id', cylinderIds)

        if (cylinderError) throw cylinderError
      }

      // Refresh order data
      fetchOrderDetails()
      
      // Show success message
      alert(`Order status updated to ${newStatus}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'dispatched': return 'bg-blue-100 text-blue-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'returned': return 'bg-purple-100 text-purple-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleString()
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
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold text-gray-900">Dispatch Order Details</h1>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="text-red-500">Error: {error}</div>
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

  if (!order) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow">
            <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
              <h1 className="text-3xl font-bold text-gray-900">Dispatch Order Details</h1>
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

  const canUpdateStatus = 
    (user?.role === 'warehouse' && ['pending', 'dispatched'].includes(order.status)) ||
    (user?.role === 'delivery' && order.delivery_person_id === user.id && ['dispatched', 'delivered'].includes(order.status)) ||
    (user?.role === 'admin')

  return (
    <ProtectedRoute requiredRole={user?.role === 'delivery' ? 'delivery' : undefined}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Dispatch Order #{order.id}</h1>
            <button
              onClick={() => router.push('/dispatch')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Orders
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Details */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <div className="mt-1">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Created</h3>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(order.created_at)}</p>
                  </div>
                  
                  {order.dispatched_at && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Dispatched</h3>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(order.dispatched_at)}</p>
                    </div>
                  )}
                  
                  {order.delivered_at && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Delivered</h3>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(order.delivered_at)}</p>
                    </div>
                  )}
                  
                  {order.returned_at && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Returned</h3>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(order.returned_at)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Information</h2>
                
                <div className="space-y-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Name</h3>
                    <p className="mt-1 text-sm text-gray-900">{customer?.name || 'N/A'}</p>
                  </div>
                  
                  {customer?.address && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Address</h3>
                      <p className="mt-1 text-sm text-gray-900">{customer.address}</p>
                    </div>
                  )}
                  
                  {customer?.phone && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                      <p className="mt-1 text-sm text-gray-900">{customer.phone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Cylinders */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Cylinders ({cylinders.length})</h2>
                
                {cylinders.length === 0 ? (
                  <p className="text-gray-500">No cylinders in this order</p>
                ) : (
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Serial Number
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {cylinders.map((cylinder) => (
                          <tr key={cylinder.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {cylinder.serial_number}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {(cylinder as any).cylinder_types?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${cylinder.status === 'in_stock' ? 'bg-green-100 text-green-800' : 
                                  cylinder.status === 'dispatched' ? 'bg-yellow-100 text-yellow-800' : 
                                  cylinder.status === 'delivered' ? 'bg-blue-100 text-blue-800' : 
                                  'bg-gray-100 text-gray-800'}`}>
                                {cylinder.status.charAt(0).toUpperCase() + cylinder.status.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar with Actions */}
            <div className="space-y-6">
              {/* Delivery Person */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Person</h2>
                
                <div className="space-y-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Assigned To</h3>
                    <p className="mt-1 text-sm text-gray-900">
                      {deliveryPerson?.full_name || 'Not assigned'}
                    </p>
                  </div>
                  
                  {user?.role === 'warehouse' && order.status === 'pending' && (
                    <button
                      onClick={() => router.push(`/dispatch/${order.id}/assign`)}
                      className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Change Assignment
                    </button>
                  )}
                </div>
              </div>

              {/* Status Actions */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Actions</h2>
                
                {canUpdateStatus ? (
                  <div className="space-y-3">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate('dispatched')}
                        disabled={updating}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {updating ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating...
                          </>
                        ) : (
                          'Mark as Dispatched'
                        )}
                      </button>
                    )}
                    
                    {order.status === 'dispatched' && user?.role === 'delivery' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate('delivered')}
                          disabled={updating}
                          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        >
                          {updating ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Updating...
                            </>
                          ) : (
                            'Mark as Delivered'
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleStatusUpdate('returned')}
                          disabled={updating}
                          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                        >
                          {updating ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Updating...
                            </>
                          ) : (
                            'Mark as Returned'
                          )}
                        </button>
                      </>
                    )}
                    
                    {user?.role !== 'delivery' && order.status !== 'cancelled' && (
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to cancel this order?')) {
                            handleStatusUpdate('cancelled')
                          }
                        }}
                        disabled={updating}
                        className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {updating ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating...
                          </>
                        ) : (
                          'Cancel Order'
                        )}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center">
                    {user?.role === 'delivery' 
                      ? 'You can only update status for orders assigned to you' 
                      : 'You do not have permission to update this order'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}