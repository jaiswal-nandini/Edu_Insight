import { io } from 'socket.io-client';

// Use websocket transport only to bypass HTTP polling and session affinity issues in reverse proxies
export const socket = io({
  autoConnect: false,
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000,
});

