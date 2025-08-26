import { supabase } from '@/utils/supabaseClient'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Attempt to fetch data from the 'inventory_items' table
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
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