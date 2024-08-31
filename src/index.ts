import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { getRoomId, isOmokGameEnd } from "./utils";

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(server, {
  cors: {
    origin: ["http://localhost:3000", "https://omok.geniuslhs.com"],
    methods: ["GET", "POST"],
  },
});

let omokGames: OmokGame[] = [];

// let gomokuInformation = {}; // Example : { foobar: { 오목판정보 } }
// let gomokuScore = {}; // Example: { foobar: [1, 2]}  -> 1대2 라는 뜻
// let gomokuRematch = {}; // Example: { foobar: {Alice: false, Bob: true}]}  -> Bob만 찬성
// let gomokuPreviousWinner = {}; // Example: { foobar: 'Alice'}
// let userNumber = {}; // Example : { foobar: 1}}

io.on("connection", (socket) => {
  socket.on("newRoom", (option) => {
    let roomId = getRoomId();

    socket.join(roomId);

    let omokGame: OmokGame = {
      roomId,
      option,
      stones: [],
      p1: socket.id,
      p2: null,
      score: {
        p1: 0,
        p2: 0,
      },
      rematch: {
        p1: false,
        p2: false,
      },
      isP1Black: false,
      guests: [],
      allUsers: [socket.id],
    };

    omokGames.push(omokGame);

    io.to(roomId).emit("newRoomId", roomId);
  });

  socket.on("joinRoom", (roomId) => {
    const omokGame = omokGames.find((omokGame) => omokGame.roomId === roomId);

    if (!omokGame) {
      socket.emit("error", "room_not_exist");
    } else if (!omokGame.p2) {
      omokGame.p2 = socket.id;

      socket.join(roomId);

      socket.emit("gameStart", omokGame.option, false);
    } else {
      omokGame.guests.push(socket.id);

      socket.join(roomId);

      io.in(roomId).emit("guestsNumberChange", omokGame.guests.length);
    }
  });

  socket.on("newStone", (stone) => {
    const omokGame = omokGames.find((omokGame) => omokGame.allUsers.includes(socket.id));
    if (!omokGame) {
      socket.emit("error", "room_not_exist");
      return;
    }

    const roomId = omokGame.roomId;
    const isP1 = omokGame.p1 === socket.id;
    const isBlack = isP1 === omokGame.isP1Black;

    const isBlackTurn = omokGame.stones.length % 2 === 0;

    if (isBlack !== isBlackTurn) return;

    if (omokGame.stones.find((s) => s.x === stone.x && s.y === stone.y)) {
      return;
    }

    omokGame.stones.push(stone);
    io.to(roomId).emit("newStone", stone);

    if (isOmokGameEnd(omokGame.stones, stone)) {
      const isP1Win = isP1;

      if (isP1Win) {
        omokGame.isP1Black = false;
        omokGame.score = { ...omokGame.score, p1: omokGame.score.p1 + 1 };
      } else {
        omokGame.isP1Black = true;
        omokGame.score = { ...omokGame.score, p2: omokGame.score.p2 + 1 };
      }

      io.in(roomId).emit("gameEnd", isP1Win, omokGame.score);
    }
  });

  socket.on("requestRematch", () => {
    const omokGame = omokGames.find((omokGame) => omokGame.allUsers.includes(socket.id));
    if (!omokGame) {
      socket.emit("error", "room_not_exist");
      return;
    }

    const roomId = omokGame.roomId;
    const isP1 = omokGame.p1 === socket.id;

    if (isP1) omokGame.rematch.p1 = true;
    else omokGame.rematch.p2 = true;

    io.in(roomId).emit("requestRematch", omokGame.rematch);

    const isRematch = omokGame.rematch.p1 && omokGame.rematch.p2;

    if (isRematch) {
      io.in(roomId).emit("gameStart", omokGame.option, omokGame.isP1Black);

      omokGame.stones = [];
      omokGame.rematch = { p1: false, p2: false };
    }
  });

  socket.on("timeOut", () => {
    const omokGame = omokGames.find((omokGame) => omokGame.allUsers.includes(socket.id));
    if (!omokGame) {
      socket.emit("error", "room_not_exist");
      return;
    }

    const roomId = omokGame.roomId;
    const isP1 = omokGame.p1 === socket.id;

    const isP1Win = !isP1;

    if (isP1Win) {
      omokGame.isP1Black = false;
      omokGame.score = { ...omokGame.score, p1: omokGame.score.p1 + 1 };
    } else {
      omokGame.isP1Black = true;
      omokGame.score = { ...omokGame.score, p2: omokGame.score.p2 + 1 };
    }

    io.in(roomId).emit("gameEnd", isP1Win, omokGame.score);
  });

  socket.on("disconnect", () => {
    const omokGame = omokGames.find((omokGame) => omokGame.allUsers.includes(socket.id));
    if (!omokGame) {
      socket.emit("error", "room_not_exist");
      return;
    }

    const roomId = omokGame.roomId;
    const isP1 = omokGame.p1 === socket.id;
    const isP2 = omokGame.p1 === socket.id;
    const isGuest = !isP1 && !isP2;

    if (isP1 || isP2) {
      socket.to(roomId).emit("error", "opponent_disconnected");
    } else if (isGuest) {
      omokGame.guests = omokGame.guests.filter((guest) => guest !== socket.id);
    }
  });
});

server.listen(5000, () => "Server is running on port 5000");
