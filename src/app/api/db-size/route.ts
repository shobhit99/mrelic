import { NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';

export async function GET() {
  try {
    const dbSize = databaseService.getDbSize();
    return NextResponse.json({
      success: true,
      size: dbSize,
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting database size:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get database size'
    }, { status: 500 });
  }
} 