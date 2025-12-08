import { NextResponse } from 'next/server'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint parameter is required' },
        { status: 400 }
      )
    }
    
    const baseUrl = 'http://64.227.126.176:3001/api/maysene-rewards'
    const response = await fetch(`${baseUrl}/${endpoint}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching EPS rewards data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch EPS rewards data', details: error.message },
      { status: 500 }
    )
  }
}