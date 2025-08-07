import { NextRequest, NextResponse } from 'next/server';
import { databaseService } from '@/lib/database';

// POST endpoint to receive logs
export async function POST(request: NextRequest) {
  try {
    // return NextResponse.json({
    //   success: true,
    //   message: 'Logs received successfully'
    // }, { status: 200 });
    // Parse the request body
    let body = await request.json();
    // Get headers from the request
    const headers = request.headers;

    // Handle different log formats
    let logsToProcess = [];

    // Check if the body is an array or a single log entry
    if (Array.isArray(body)) {
      body = body.map((log) => {
        if (log.meta && typeof log.meta === 'object') {
          const meta = log.meta;
          delete log.meta;
          log = { ...log, ...meta };
        }
        return log;
      });
      logsToProcess = body;
    } else {
      if (body.meta && typeof body.meta === 'object') {
        const meta = body.meta;
        delete body.meta;
        body = { ...body, ...meta };
      }
      logsToProcess = [body];
    }

    // Process each log entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedLogs = logsToProcess.map((log: any) =>
      databaseService.addLog(log, headers),
    );

    return NextResponse.json(
      {
        success: true,
        count: processedLogs.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error processing logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process logs',
      },
      { status: 500 },
    );
  }
}

// GET endpoint to retrieve logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get query parameters for filtering
    const query = searchParams.get('query') || '';
    const level = searchParams.get('level') || '';
    const service = searchParams.get('service') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filters object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filters: any = {};
    if (query) filters.query = query;
    if (level) filters.level = level;
    if (service) filters.service = service;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (limit) filters.limit = limit;
    if (offset) filters.offset = offset;

    // Get logs from database
    const logs = databaseService.getLogs(filters);
    const totalCount = databaseService.getLogCount(filters);

    // Get unique levels and services for filter options
    const levels = databaseService.getLevels();
    const services = databaseService.getServices();

    return NextResponse.json(
      {
        success: true,
        count: logs.length,
        totalCount: totalCount,
        logs: logs,
        levels: levels,
        services: services,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error retrieving logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve logs',
      },
      { status: 500 },
    );
  }
}

// DELETE endpoint to clear logs
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const service = searchParams.get('service') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    databaseService.clearLogs({ service, endDate });
    return NextResponse.json(
      {
        success: true,
        message: 'Logs cleared successfully',
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error clearing logs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear logs',
      },
      { status: 500 },
    );
  }
}
