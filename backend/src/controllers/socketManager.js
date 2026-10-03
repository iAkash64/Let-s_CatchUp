import { Server } from "socket.io";

const connections = {};
const messages = {};

export const connectToSocket = (server) => {
  const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim());

  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("SOMETHING CONNECTED");
    socket.on("join-call", (path) => {
      if (connections[path] === undefined) {
        connections[path] = [];
        messages[path] = [];
      }

      if (connections[path].includes(socket.id)) return;

      const existingUserIds = [...connections[path]];
      connections[path].push(socket.id);

      // Only the new person creates offers to people already in the room.
      // This prevents all browsers from replacing their WebRTC connections
      // every time another participant joins.
      io.to(socket.id).emit("existing-users", existingUserIds);

      for (let a = 0; a < messages[path].length; a++) {
        io.to(socket.id).emit(
          "chat-message",
          messages[path][a].data,
          messages[path][a].sender,
          messages[path][a]["socket-id-sender"],
        );
      }
    });

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      const [matchingRoom, found] = Object.entries(connections).reduce(
        ([room, isFound], [roomKey, roomValue]) => {
          if (!isFound && roomValue.includes(socket.id)) {
            return [roomKey, true];
          }
          return [room, isFound];
        },
        ["", false],
      );

      if (found === true) {
        if (messages[matchingRoom] === undefined) {
          messages[matchingRoom] = [];
        }
        messages[matchingRoom].push({
          sender: sender,
          data: data,
          "socket-id-sender": socket.id,
        });
        console.log("message", matchingRoom, ":", sender, data);

        connections[matchingRoom].forEach((elem) => {
          io.to(elem).emit("chat-message", data, sender, socket.id);
        });
      }
    });

    socket.on("disconnect", () => {
      const key = Object.keys(connections).find((room) =>
        connections[room].includes(socket.id),
      );

      if (!key) return;

      connections[key] = connections[key].filter((id) => id !== socket.id);
      connections[key].forEach((socketId) => {
        io.to(socketId).emit("user-left", socket.id);
      });

      if (connections[key].length === 0) {
        delete connections[key];
        delete messages[key];
      }
    });
  });

  return io;
};
