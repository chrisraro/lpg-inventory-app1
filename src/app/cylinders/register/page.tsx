'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/hooks/useAuth'
import { supabase, CylinderType } from '@/utils/supabaseClient'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

// Define the form schema with Zod
const cylinderSchema = z.object({
  serial_number: z.string().min(1, 'Serial number is required'),
  cylinder_type_id: z.string().min(1, 'Cylinder type is required'),
  notes: z.string().optional(),
})

type CylinderFormInputs = z.infer<typeof cylinderSchema>

export default function CylinderRegistration() {
  const { user } = useAuth()
  const router = useRouter()
  const [cylinderTypes, setCylinderTypes] = useState<CylinderType[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CylinderFormInputs>({
    resolver: zodResolver(cylinderSchema),
  })

  // Fetch cylinder types
  useEffect(() => {
    const fetchCylinderTypes = async () => {
      try {
        const { data, error } = await supabase
          .from('cylinder_types')
          .select('*')
          .order('name')

        if (error) throw error
        setCylinderTypes(data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch cylinder types')
      } finally {
        setLoading(false)
      }
    }

    fetchCylinderTypes()
  }, [])

  const onSubmit: SubmitHandler<CylinderFormInputs> = async (data) => {
    setSubmitting(true)
    setError(null)

    try {
      const { error } = await supabase
        .from('cylinders')
        .insert([
          {
            serial_number: data.serial_number,
            cylinder_type_id: parseInt(data.cylinder_type_id),
            status: 'in_stock',
            notes: data.notes || null,
          },
        ])

      if (error) throw error

      // Reset form and show success message
      reset()
      alert('Cylinder registered successfully!')
      router.push('/cylinders')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register cylinder')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProtectedRoute requiredRole="warehouse">
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">Register New Cylinder</h1>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {error && (
                <div className="rounded-md bg-red-50 p-4">
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

              <div>
                <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700">
                  Serial Number
                </label>
                <div className="mt-1">
                  <input
                    id="serial_number"
                    {...register('serial_number')}
                    className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                      errors.serial_number ? 'border-red-300' : ''
                    }`}
                  />
                  {errors.serial_number && (
                    <p className="mt-2 text-sm text-red-600">{errors.serial_number.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="cylinder_type_id" className="block text-sm font-medium text-gray-700">
                  Cylinder Type
                </label>
                <div className="mt-1">
                  {loading ? (
                    <div className="flex items-center justify-center h-10">
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : (
                    <select
                      id="cylinder_type_id"
                      {...register('cylinder_type_id')}
                      className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                        errors.cylinder_type_id ? 'border-red-300' : ''
                      }`}
                    >
                      <option value="">Select a cylinder type</option>
                      {cylinderTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} ({type.capacity}L)
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.cylinder_type_id && (
                    <p className="mt-2 text-sm text-red-600">{errors.cylinder_type_id.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <div className="mt-1">
                  <textarea
                    id="notes"
                    {...register('notes')}
                    rows={3}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.push('/cylinders')}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Registering...
                    </>
                  ) : (
                    'Register Cylinder'
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