import { NextRequest, NextResponse } from 'next';
import { executePerformanceQuery } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sdk_id = parseInt(searchParams.get('sdk_id') || '1', 10);
    const platform = searchParams.get('platform') || 'android';

    const result = executePerformanceQuery(sdk_id, platform);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error in /api/query-performance:', error);
    return NextResponse.json({ 
      error: error?.message || 'Internal Server Error',
      details: String(error)
    }, { status: 500 });
  }
}
