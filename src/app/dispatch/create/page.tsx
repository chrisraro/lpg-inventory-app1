'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { supabase, Customer, Cylinder, Profile } from '@/utils/supabaseClient'
import { useAuth } from '@/hooks/useAuth'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function CreateDispatchOrder() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [deliveryPersonnel, setDeliveryPersonnel] = useState<Profile[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null)
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState<string | null>(null)
  const [cylinders, setCylinders] = useState<Cylinder[]>([])
  const [scannedCylinders, setScannedCylinders] = useState<Cylinder[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanMode, setScanMode] = useState(false)
  const router = useRouter()

  // Fetch customers, delivery personnel, and cylinders
  useEffect(() => {
    Promise.all([
      fetchCustomers(),
      fetchDeliveryPersonnel(),
      fetchAvailableCylinders()
    ]).finally(() => setLoading(false))
  }, [])

  async function fetchCustomers() {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch customers')
    }
  }

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

  async function fetchAvailableCylinders() {
    try {
      const { data, error } = await supabase
        .from('cylinders')
        .select(`
          *,
          cylinder_types(name, weight, capacity)
        `)
        .eq('status', 'in_stock')
        .order('serial_number')

      if (error) throw error
      setCylinders(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch available cylinders')
    }
  }

  // Initialize QR scanner when scan mode is enabled
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null

    if (scanMode) {
      scanner = new Html5QrcodeScanner(
        'reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )

      scanner.render(
        async (decodedText) => {
          handleScanSuccess(decodedText)
        },
        (errorMessage) => {
          console.debug('Scan error:', errorMessage)
        }
      )
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(error => {
          console.error('Failed to clear scanner:', error)
        })
      }
    }
  }, [scanMode])

  const handleScanSuccess = async (serialNumber: string) => {
    try {
      // Check if cylinder is already scanned
      if (scannedCylinders.some(c => c.serial_number === serialNumber)) {
        return
      }

      // Find cylinder in available cylinders
      const cylinder = cylinders.find(c => c.serial_number === serialNumber)
      
      if (cylinder) {
        setScannedCylinders(prev => [...prev, cylinder])
        
        // Play scan sound
        if (typeof window !== 'undefined') {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.type = 'sine'
          oscillator.frequency.value = 800
          gainNode.gain.value = 0.3
          
          oscillator.start()
          setTimeout(() => {
            oscillator.stop()
          }, 100)
        }
      } else {
        // Try to fetch cylinder from database
        const { data, error } = await supabase
          .from('cylinders')
          .select(`
            *,
            cylinder_types(name, weight, capacity)
          `)
          .eq('serial_number', serialNumber)
          .single<Cylinder>()

        if (data && data.status === 'in_stock') {
          setScannedCylinders(prev => [...prev, data])
          
          // Play scan sound
          if (typeof window !== 'undefined') {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()
            
            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)
            
            oscillator.type = 'sine'
            oscillator.frequency.value = 800
            gainNode.gain.value = 0.3
            
            oscillator.start()
            setTimeout(() => {
              oscillator.stop()
            }, 100)
          }
        }
      }
    } catch (err) {
      console.error('Scan error:', err)
    }
  }

  const removeCylinder = (cylinderId: number) => {
    setScannedCylinders(prev => prev.filter(c => c.id !== cylinderId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (!selectedCustomer) {
      setError('Please select a customer')
      setSubmitting(false)
      return
    }

    if (scannedCylinders.length === 0) {
      setError('Please add at least one cylinder to the order')
      setSubmitting(false)
      return
    }

    try {
      // Create the dispatch order
      const { data: order, error: orderError } = await supabase
        .from('dispatch_orders')
        .insert([
          {
            customer_id: selectedCustomer,
            delivery_person_id: selectedDeliveryPerson,
            status: 'pending'
          }
        ])
        .select()
        .single()

      if (orderError) throw orderError

      // Add cylinders to the order
      const orderItems = scannedCylinders.map(cylinder => ({
        dispatch_order_id: order.id,
        cylinder_id: cylinder.id
      }))

      const { error: itemsError } = await supabase
        .from('dispatch_order_items')
        .insert(orderItems)

      if (itemsError) throw itemsError

      // Update cylinder status to 'dispatched'
      const cylinderIds = scannedCylinders.map(c => c.id)
      const { error: cylinderError } = await supabase
        .from('cylinders')
        .update({ status: 'dispatched' })
        .in('id', cylinderIds)

      if (cylinderError) throw cylinderError

      // Success - redirect to order details
      router.push(`/dispatch/${order.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dispatch order')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProtectedRoute requiredRole="warehouse">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Create Dispatch Order</h1>
            <button
              onClick={() => router.push('/dispatch')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Form */}
            <div className="bg-white shadow rounded-lg p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
                    Customer
                  </label>
                  <div className="mt-1">
                    <select
                      id="customer"
                      value={selectedCustomer || ''}
                      onChange={(e) => setSelectedCustomer(Number(e.target.value))}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      disabled={loading}
                    >
                      <option value="">Select a customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="deliveryPerson" className="block text-sm font-medium text-gray-700">
                    Delivery Person (Optional)
                  </label>
                  <div className="mt-1">
                    <select
                      id="deliveryPerson"
                      value={selectedDeliveryPerson || ''}
                      onChange={(e) => setSelectedDeliveryPerson(e.target.value || null)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      disabled={loading}
                    >
                      <option value="">Assign later</option>
                      {deliveryPersonnel.map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Cylinders</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Add cylinders to this order by scanning QR codes or selecting from the list below.
                  </p>
                  
                  <button
                    type="button"
                    onClick={() => setScanMode(!scanMode)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {scanMode ? 'Exit Scan Mode' : 'Enter Scan Mode'}
                  </button>
                  
                  {scannedCylinders.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Added Cylinders:</h4>
                      <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                        {scannedCylinders.map((cylinder) => (
                          <li key={cylinder.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                            <div className="w-0 flex-1 flex items-center">
                              <span className="font-medium text-gray-900 truncate">
                                {cylinder.serial_number}
                              </span>
                              <span className="ml-2 text-gray-500">
                                ({(cylinder as any).cylinder_types?.name || 'N/A'})
                              </span>
                            </div>
                            <div className="ml-4 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => removeCylinder(cylinder.id)}
                                className="font-medium text-red-600 hover:text-red-500"
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => router.push('/dispatch')}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || loading}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </>
                    ) : (
                      'Create Dispatch Order'
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Scanner or Cylinder List */}
            <div className="bg-white shadow rounded-lg p-6">
              {scanMode ? (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Scan QR Code</h3>
                  <div id="reader" className="w-full flex justify-center"></div>
                  <p className="mt-4 text-sm text-gray-500">
                    Position the QR code in the frame above to scan. A sound will play when a cylinder is successfully added.
                  </p>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Available Cylinders</h3>
                  {loading ? (
                    <div className="flex justify-center items-center h-32">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : cylinders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No cylinders available for dispatch</p>
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
                              Actions
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => {
                                    if (!scannedCylinders.some(c => c.id === cylinder.id)) {
                                      setScannedCylinders(prev => [...prev, cylinder])
                                    }
                                  }}
                                  disabled={scannedCylinders.some(c => c.id === cylinder.id)}
                                  className={`${
                                    scannedCylinders.some(c => c.id === cylinder.id)
                                      ? 'text-gray-400 cursor-not-allowed'
                                      : 'text-blue-600 hover:text-blue-900'
                                  }`}
                                >
                                  {scannedCylinders.some(c => c.id === cylinder.id) ? 'Added' : 'Add'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}