import { createBrowserClient } from '@supabase/ssr'

// Types for our database tables
export type Profile = {
  id: string
  updated_at: string
  full_name: string | null
  avatar_url: string | null
  website: string | null
  role: 'admin' | 'warehouse' | 'delivery'
}

export type Customer = {
  id: number
  created_at: string
  updated_at: string
  name: string
  address: string | null
  contact_person: string | null
  phone: string | null
  email: string | null
  is_business: boolean
}

export type CylinderType = {
  id: number
  created_at: string
  name: string
  weight: number
  capacity: number
}

export type CylinderStatus = 
  | 'registered'
  | 'in_stock'
  | 'dispatched'
  | 'delivered'
  | 'returned'
  | 'damaged'
  | 'retired'

export type Cylinder = {
  id: number
  created_at: string
  updated_at: string
  serial_number: string
  cylinder_type_id: number
  status: CylinderStatus
  current_customer_id: number | null
  notes: string | null
}

export type Transaction = {
  id: number
  created_at: string
  cylinder_id: number
  from_status: CylinderStatus | null
  to_status: CylinderStatus
  performed_by: string
  notes: string | null
}

export type DispatchOrderStatus = 
  | 'pending'
  | 'dispatched'
  | 'delivered'
  | 'returned'
  | 'cancelled'

export type DispatchOrder = {
  id: number
  created_at: string
  dispatched_at: string | null
  delivered_at: string | null
  returned_at: string | null
  delivery_person_id: string | null
  customer_id: number
  status: DispatchOrderStatus
}

export type DispatchOrderItem = {
  id: number
  created_at: string
  dispatch_order_id: number
  cylinder_id: number
}

// Initialize Supabase client with fallback values to prevent build errors
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)