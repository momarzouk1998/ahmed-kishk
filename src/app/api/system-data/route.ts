import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (key) {
      const record = await prisma.systemStore.findUnique({
        where: { key },
      });
      return NextResponse.json({ success: true, key, data: record?.data ?? null });
    }

    // Return all system store items in one call
    const allRecords = await prisma.systemStore.findMany();
    const dataMap: Record<string, any> = {};
    for (const r of allRecords) {
      dataMap[r.key] = r.data;
    }

    return NextResponse.json({ success: true, data: dataMap });
  } catch (error: any) {
    console.error('Error fetching system data from database:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, data } = body;

    if (!key) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    const saved = await prisma.systemStore.upsert({
      where: { key },
      create: {
        key,
        data: data ?? [],
      },
      update: {
        data: data ?? [],
      },
    });

    return NextResponse.json({ success: true, key: saved.key, data: saved.data });
  } catch (error: any) {
    console.error('Error saving system data to database:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
