import { NextResponse } from 'next/server';
import { getPipelineStats } from '@/lib/db';

export async function GET() {
  try {
    const stats = getPipelineStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
