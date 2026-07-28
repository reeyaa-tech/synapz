import { io } from "socket.io-client";

export const socket = io(''https://synapz-p7bs.onrender.com', {
  autoConnect: true,
  transports: ["websocket"]
});
