import { NextRequest, NextResponse } from 'next/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function GET(_: NextRequest) {
  return NextResponse.json({ 
    status: 'Socket.IO API endpoint ready',
    message: 'Socket.IO is handled client-side in this application'
  });
}