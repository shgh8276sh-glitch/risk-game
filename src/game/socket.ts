import { io, Socket } from 'socket.io-client';

// اگر روی سیستم خودتان هستید به پورت 4000 وصل می‌شود، بعداً آدرس سرور آنلاین را اینجا می‌گذاریم
const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-service.onrender.com' // بعداً آدرس سرور رندر را اینجا می‌زنید
  : 'http://localhost:4000';

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
});