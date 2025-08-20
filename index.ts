#!/usr/bin/env node
"use strict";

import express, { Express } from "express";
import http from "http";
import { Server, Socket } from "socket.io";

const port = 8001;
const app: Express = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

server.listen(port, () => {
  console.log(`epsile server listening at port ${port}`);
});

app.use(express.static(__dirname + "/"));

// Types
interface UserData {
  connectedTo: string | number;
  isTyping: boolean;
}

// Global vars
const sockets: Record<string, Socket> = {};
const users: Record<string, UserData> = {};
let strangerQueue: string | false = false;
let peopleActive = 0;
let peopleTotal = 0;

function fillZero(val: number): string {
  return val > 9 ? "" + val : "0" + val;
}

function timestamp(): string {
  const now = new Date();
  return `[${fillZero(now.getHours())}:${fillZero(
    now.getMinutes()
  )}:${fillZero(now.getSeconds())}]`;
}

// --- Match User Helper ---
function matchUser(socket: Socket | undefined) {
  if (!socket) return;

  if (strangerQueue !== false && strangerQueue !== socket.id) {
    // connect with waiting stranger
    users[socket.id].connectedTo = strangerQueue;
    users[strangerQueue].connectedTo = socket.id;

    sockets[socket.id].emit("conn");
    sockets[strangerQueue].emit("conn");

    strangerQueue = false;
  } else {
    strangerQueue = socket.id;
  }
}

io.on("connection", (socket: Socket) => {
  sockets[socket.id] = socket;
  users[socket.id] = { connectedTo: -1, isTyping: false };

  // Pairing logic
  if (strangerQueue !== false) {
    users[socket.id].connectedTo = strangerQueue;
    users[strangerQueue].connectedTo = socket.id;
    users[socket.id].isTyping = false;
    users[strangerQueue].isTyping = false;
    socket.emit("conn");
    sockets[strangerQueue].emit("conn");
    strangerQueue = false;
  } else {
    strangerQueue = socket.id;
  }

  peopleActive++;
  peopleTotal++;
  console.log(timestamp(), peopleTotal, "connect");
  io.emit("stats", { people: peopleActive });

  // --- Events ---

  socket.on("new", () => {
    if (strangerQueue !== false) {
      users[socket.id].connectedTo = strangerQueue;
      users[strangerQueue].connectedTo = socket.id;
      users[socket.id].isTyping = false;
      users[strangerQueue].isTyping = false;
      socket.emit("conn");
      sockets[strangerQueue].emit("conn");
      strangerQueue = false;
    } else {
      strangerQueue = socket.id;
    }
    peopleActive++;
    io.emit("stats", { people: peopleActive });
  });

  socket.on("disconn", () => {
    const connTo = users[socket.id].connectedTo;
    if (strangerQueue === socket.id || strangerQueue === connTo) {
      strangerQueue = false;
    }
    users[socket.id].connectedTo = -1;
    users[socket.id].isTyping = false;
    if (sockets[connTo]) {
      users[connTo].connectedTo = -1;
      users[connTo].isTyping = false;
      sockets[connTo].emit("disconn", { who: 2 });
    }
    socket.emit("disconn", { who: 1 });
    peopleActive -= 2;
    io.emit("stats", { people: peopleActive });
  });

  socket.on("chat", (message: string) => {
    const connTo = users[socket.id].connectedTo;
    if (connTo !== -1 && sockets[connTo]) {
      sockets[connTo].emit("chat", message);
    }
  });

  socket.on("typing", (isTyping: boolean) => {
    const connTo = users[socket.id].connectedTo;
    if (
      connTo !== -1 &&
      sockets[connTo] &&
      users[socket.id].isTyping !== isTyping
    ) {
      users[socket.id].isTyping = isTyping;
      sockets[connTo].emit("typing", isTyping);
    }
  });

  // --- Video Call Signaling ---
  socket.on("video-offer", (data) => {
    const connTo = users[socket.id].connectedTo;
    if (connTo !== -1 && sockets[connTo]) {
      sockets[connTo].emit("video-offer", data);
    }
  });

  socket.on("video-answer", (data) => {
    const connTo = users[socket.id].connectedTo;
    if (connTo !== -1 && sockets[connTo]) {
      sockets[connTo].emit("video-answer", data);
    }
  });

  socket.on("ice-candidate", (candidate) => {
    const connTo = users[socket.id].connectedTo;
    if (connTo !== -1 && sockets[connTo]) {
      sockets[connTo].emit("ice-candidate", candidate);
    }
  });

  // --- Skip Logic ---
  socket.on("skip", () => {
    console.log("User skipped:", socket.id);

    const connTo = users[socket.id].connectedTo;

    if (connTo !== -1 && sockets[connTo]) {
      users[connTo].connectedTo = -1;
      users[socket.id].connectedTo = -1;

      sockets[connTo].emit("skip");
      sockets[socket.id].emit("skip");

      matchUser(socket);
      matchUser(sockets[connTo]);
    } else {
      matchUser(socket);
    }
  });

  socket.on("disconnect", (reason) => {
    const connTo = users[socket.id]?.connectedTo ?? -1;
    if (connTo !== -1 && sockets[connTo]) {
      sockets[connTo].emit("disconn", { who: 2, reason });
      users[connTo].connectedTo = -1;
      users[connTo].isTyping = false;
      peopleActive -= 2;
    }

    delete sockets[socket.id];
    delete users[socket.id];
    

    if (strangerQueue === socket.id || strangerQueue === connTo) {
      strangerQueue = false;
      peopleActive--;
    }

    peopleTotal--;
    console.log(timestamp(), peopleTotal, "disconnect");
    io.emit("stats", { people: peopleActive });
  });
});
