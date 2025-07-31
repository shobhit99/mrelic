import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Server as HTTPSServer } from 'https';
import logStore from './logStore';

let io: SocketIOServer | null = null;

export function initSocketIO(server: HTTPServer | HTTPSServer) {
  if (io) return io;

  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send all current logs to the newly connected client
    socket.emit('logs', logStore.getLogs());
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function emitNewLog(log: any) {
  if (io) {
    io.emit('newLog', log);
  }
}