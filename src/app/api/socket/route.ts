import { NextRequest, NextResponse } from 'next/server';

export function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'Socket.IO API endpoint ready',
    message: 'Socket.IO is handled client-side in this application'
  });
}