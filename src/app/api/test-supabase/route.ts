import { createClient } from '@/utils/supabaseServer'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createClient()
    
    // Check if Supabase client was created successfully
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 })
    }
    
    // Test database connection by fetching cylinder types
    const { data, error } = await supabase
      .from('cylinder_types')
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