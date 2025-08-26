import { createClient } from '@/utils/supabaseServer'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Test database connection by fetching dispatch orders
    const { data, error } = await supabase
      .from('dispatch_orders')
      .select(`
        *,
        customers(name),
        profiles(full_name)
      `)
      .limit(1)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Successfully connected to Supabase!', 
      data: data || [] 
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: 'Failed to connect to Supabase' }, { status: 500 })
  }
}