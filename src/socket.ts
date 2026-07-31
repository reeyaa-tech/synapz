import { io } from "socket.io-client";

export const socket = io('https://synapz-p7bs.onrender.com', {
  transports: ['polling', 'websocket'], // Try polling first, then upgrade to websocket
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});
