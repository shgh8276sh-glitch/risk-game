import { io, Socket } from 'socket.io-client';

// آدرس سرور ابری آنلاین شما روی Render
const SOCKET_URL = 'https://risk-game-server.onrender.com';

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});