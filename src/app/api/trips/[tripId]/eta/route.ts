import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    const params = await context.params;
    const baseUrl = process.env.NEXT_PUBLIC_CAN_BUS_ENDPOINT;
    const url = `${baseUrl}/api/trips/${params.tripId}/eta?company=maysene`;
    const response = await fetch(url);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ETA' }, { status: 500 });
  }
}
