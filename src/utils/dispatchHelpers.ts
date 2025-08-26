import { supabase, DispatchOrder, Cylinder } from '@/utils/supabaseClient'

// Get all dispatch orders
export async function getDispatchOrders() {
  const { data, error } = await supabase
    .from('dispatch_orders')
    .select(`
      *,
      customers(name, address),
      profiles(full_name)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Get a specific dispatch order by ID
export async function getDispatchOrder(id: number) {
  const { data, error } = await supabase
    .from('dispatch_orders')
    .select(`
      *,
      customers(name, address, phone),
      profiles(full_name)
    `)
    .eq('id', id)
    .single<DispatchOrder>()

  if (error) throw error
  return data
}

// Create a new dispatch order
export async function createDispatchOrder(order: Omit<DispatchOrder, 'id' | 'created_at' | 'dispatched_at' | 'delivered_at' | 'returned_at'>) {
  const { data, error } = await supabase
    .from('dispatch_orders')
    .insert([order])
    .select()
    .single<DispatchOrder>()

  if (error) throw error
  return data
}

// Update a dispatch order
export async function updateDispatchOrder(id: number, updates: Partial<DispatchOrder>) {
  const { data, error } = await supabase
    .from('dispatch_orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single<DispatchOrder>()

  if (error) throw error
  return data
}

// Add a cylinder to a dispatch order
export async function addCylinderToOrder(orderId: number, cylinderId: number) {
  const { data, error } = await supabase
    .from('dispatch_order_items')
    .insert([
      {
        dispatch_order_id: orderId,
        cylinder_id: cylinderId
      }
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

// Remove a cylinder from a dispatch order
export async function removeCylinderFromOrder(orderId: number, cylinderId: number) {
  const { error } = await supabase
    .from('dispatch_order_items')
    .delete()
    .eq('dispatch_order_id', orderId)
    .eq('cylinder_id', cylinderId)

  if (error) throw error
}

// Get cylinders in a dispatch order
export async function getCylindersInOrder(orderId: number) {
  const { data: items, error: itemsError } = await supabase
    .from('dispatch_order_items')
    .select('cylinder_id')
    .eq('dispatch_order_id', orderId)

  if (itemsError) throw itemsError

  if (items && items.length > 0) {
    const cylinderIds = items.map(item => item.cylinder_id)
    const { data: cylinders, error: cylindersError } = await supabase
      .from('cylinders')
      .select(`
        *,
        cylinder_types(name, weight, capacity)
      `)
      .in('id', cylinderIds)

    if (cylindersError) throw cylindersError
    return cylinders || []
  }

  return []
}