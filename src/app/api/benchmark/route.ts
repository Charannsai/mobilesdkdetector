import { NextRequest, NextResponse } from 'next/server';
import { executeBenchmarkTest } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sdk_id = parseInt(searchParams.get('sdk_id') || '1', 10);
    const platform = searchParams.get('platform') || 'android';
    const iterations = parseInt(searchParams.get('iterations') || '10', 10);

    const benchmarkResult = executeBenchmarkTest(sdk_id, platform, iterations);
    return NextResponse.json(benchmarkResult);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
