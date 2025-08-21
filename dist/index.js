#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
// import http from "http";
// import * as express from "express";   // ✅ express ke liye
const http = __importStar(require("http"));
const socket_io_1 = require("socket.io");
const port = process.env.PORT || 8001;
// const app = express();
// const app: Express = express();
const app = (0, express_1.default)();
const server = http.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});
server.listen(port, () => {
    console.log(`epsile server listening at port ${port}`);
});
app.use(express_1.default.static(__dirname + "/"));
// Global vars
const sockets = {};
const users = {};
let strangerQueue = false;
let peopleActive = 0;
let peopleTotal = 0;
function fillZero(val) {
    return val > 9 ? "" + val : "0" + val;
}
function timestamp() {
    const now = new Date();
    return `[${fillZero(now.getHours())}:${fillZero(now.getMinutes())}:${fillZero(now.getSeconds())}]`;
}
// --- Match User Helper ---
function matchUser(socket) {
    if (!socket)
        return;
    if (strangerQueue !== false && strangerQueue !== socket.id) {
        // connect with waiting stranger
        users[socket.id].connectedTo = strangerQueue;
        users[strangerQueue].connectedTo = socket.id;
        sockets[socket.id].emit("conn");
        sockets[strangerQueue].emit("conn");
        strangerQueue = false;
    }
    else {
        strangerQueue = socket.id;
    }
}
io.on("connection", (socket) => {
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
    }
    else {
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
        }
        else {
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
    socket.on("chat", (message) => {
        const connTo = users[socket.id].connectedTo;
        if (connTo !== -1 && sockets[connTo]) {
            sockets[connTo].emit("chat", message);
        }
    });
    socket.on("typing", (isTyping) => {
        const connTo = users[socket.id].connectedTo;
        if (connTo !== -1 &&
            sockets[connTo] &&
            users[socket.id].isTyping !== isTyping) {
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
        }
        else {
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
