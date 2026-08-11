import { NextResponse } from 'next/server';
import { getSDKAdoptionList } from '@/lib/db';

export async function GET() {
  try {
    const sdks = getSDKAdoptionList();
    return NextResponse.json({ count: sdks.length, sdks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
