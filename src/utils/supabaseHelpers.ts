import { supabase, Cylinder, Customer, CylinderType, Profile, DispatchOrder } from '@/utils/supabaseClient'

// User profile functions
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single<Profile>()

  if (error) throw error
  return data
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single<Profile>()

  if (error) throw error
  return data
}

// Cylinder functions
export async function getCylinders() {
  const { data, error } = await supabase
    .from('cylinders')
    .select(`
      *,
      cylinder_types(name, weight, capacity),
      customers(name, address)
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function getCylinderBySerial(serialNumber: string) {
  const { data, error } = await supabase
    .from('cylinders')
    .select(`
      *,
      cylinder_types(name, weight, capacity),
      customers(name, address)
    `)
    .eq('serial_number', serialNumber)
    .single<Cylinder>()

  if (error) throw error
  return data
}

export async function createCylinder(cylinder: Omit<Cylinder, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('cylinders')
    .insert([cylinder])
    .select()
    .single<Cylinder>()

  if (error) throw error
  return data
}

export async function updateCylinderStatus(cylinderId: number, status: Cylinder['status']) {
  const { data, error } = await supabase
    .from('cylinders')
    .update({ status })
    .eq('id', cylinderId)
    .select()
    .single<Cylinder>()

  if (error) throw error
  return data
}

// Customer functions
export async function getCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('customers')
    .insert([customer])
    .select()
    .single<Customer>()

  if (error) throw error
  return data
}

// Cylinder type functions
export async function getCylinderTypes() {
  const { data, error } = await supabase
    .from('cylinder_types')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

// Dispatch order functions
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

export async function createDispatchOrder(order: Omit<DispatchOrder, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('dispatch_orders')
    .insert([order])
    .select()
    .single<DispatchOrder>()

  if (error) throw error
  return data
}

// Authentication functions
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signUpWithEmail(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}