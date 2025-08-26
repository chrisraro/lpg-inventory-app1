'use client'

import { useState, useEffect, useRef } from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useRouter } from 'next/navigation'
import { supabase, Cylinder } from '@/utils/supabaseClient'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function ScanPage() {
  const [scannedCylinders, setScannedCylinders] = useState<Cylinder[]>([])
  const [currentCylinder, setCurrentCylinder] = useState<Cylinder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const router = useRouter()

  // Initialize the QR code scanner
  useEffect(() => {
    const initializeScanner = () => {
      if (scannerRef.current) return

      scannerRef.current = new Html5QrcodeScanner(
        'reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )

      scannerRef.current.render(
        async (decodedText) => {
          // Handle successful scan
          handleScanSuccess(decodedText)
        },
        (errorMessage) => {
          // Handle scan error (can be noisy, so we'll ignore for now)
          console.debug('Scan error:', errorMessage)
        }
      )
    }

    // Delay initialization to ensure DOM is ready
    const timer = setTimeout(initializeScanner, 100)

    return () => {
      clearTimeout(timer)
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error('Failed to clear scanner:', error)
        })
      }
    }
  }, [])

  const handleScanSuccess = async (serialNumber: string) => {
    setLoading(true)
    setError(null)

    try {
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

      // Fetch cylinder details
      const { data: cylinder, error } = await supabase
        .from('cylinders')
        .select(`
          *,
          cylinder_types(name, weight, capacity),
          customers(name, address)
        `)
        .eq('serial_number', serialNumber)
        .single<Cylinder>()

      if (error) throw error
      if (!cylinder) throw new Error('Cylinder not found')

      setCurrentCylinder(cylinder)
      
      // Add to scanned cylinders list if not already there
      if (!scannedCylinders.some(c => c.id === cylinder.id)) {
        setScannedCylinders(prev => [cylinder, ...prev])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cylinder')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus: Cylinder['status']) => {
    if (!currentCylinder) return

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('cylinders')
        .update({ status: newStatus })
        .eq('id', currentCylinder.id)

      if (error) throw error

      // Update local state
      const updatedCylinder = { ...currentCylinder, status: newStatus }
      setCurrentCylinder(updatedCylinder)
      
      setScannedCylinders(prev => 
        prev.map(c => c.id === currentCylinder.id ? updatedCylinder : c)
      )
      
      // Show success feedback
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(200)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cylinder status')
    } finally {
      setLoading(false)
    }
  }

  const clearCurrentCylinder = () => {
    setCurrentCylinder(null)
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Rapid Scan Mode</h1>
            <button
              onClick={() => router.push('/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Exit Scan Mode
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Scanner Section */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Scan QR Code</h2>
              <div id="reader" className="w-full flex justify-center"></div>
              
              {error && (
                <div className="mt-4 rounded-md bg-red-50 p-4">
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
            </div>

            {/* Current Cylinder Actions */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Current Cylinder</h2>
              
              {currentCylinder ? (
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {currentCylinder.serial_number}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {(currentCylinder as any).cylinder_types?.name || 'N/A'}
                        </p>
                      </div>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${currentCylinder.status === 'in_stock' ? 'bg-green-100 text-green-800' : 
                          currentCylinder.status === 'dispatched' ? 'bg-yellow-100 text-yellow-800' : 
                          currentCylinder.status === 'delivered' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-800'}`}>
                        {currentCylinder.status.charAt(0).toUpperCase() + currentCylinder.status.slice(1)}
                      </span>
                    </div>
                    
                    {currentCylinder.current_customer_id && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Customer: {(currentCylinder as any).customers?.name || 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Update Status</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {currentCylinder.status === 'in_stock' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate('dispatched')}
                            disabled={loading}
                            className="inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50"
                          >
                            {loading ? (
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : null}
                            Dispatch
                          </button>
                        </>
                      )}
                      
                      {currentCylinder.status === 'dispatched' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate('delivered')}
                            disabled={loading}
                            className="inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {loading ? (
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : null}
                            Deliver
                          </button>
                          <button
                            onClick={() => handleStatusUpdate('returned')}
                            disabled={loading}
                            className="inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            {loading ? (
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : null}
                            Return
                          </button>
                        </>
                      )}
                      
                      {currentCylinder.status === 'delivered' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate('returned')}
                            disabled={loading}
                            className="inline-flex justify-center items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            {loading ? (
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : null}
                            Return
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={clearCurrentCylinder}
                        disabled={loading}
                        className="inline-flex justify-center items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No cylinder scanned</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Scan a QR code to view and update cylinder information.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Scanned Cylinders List */}
          <div className="mt-6 bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recently Scanned</h2>
            
            {scannedCylinders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No cylinders scanned yet.</p>
              </div>
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
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scannedCylinders.slice(0, 10).map((cylinder) => (
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {(cylinder as any).customers?.name || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}