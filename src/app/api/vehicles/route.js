import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('http://64.227.138.235:3000/api/maysene-vehicles')
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    )
  }
}
