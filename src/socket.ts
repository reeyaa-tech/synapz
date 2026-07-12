import { io } from "socket.io-client";

const URL = "http://localhost:5000";

// Initialize the socket connection exactly ONCE
export const socket = io(URL, {
  autoConnect: true,
  transports: ["websocket"] // Forces clean WebSocket connections without polling lag
});