import express from "express";
import crypto from "crypto";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

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

const getRoomId = () => {
  let now = new Date();
  let roomId = crypto.createHash("sha256").update(now.toString()).digest("hex").substring(0, 8);

  return roomId;
};

function checkOmokCompleted(stone, room) {
  takes = gomokuInformation[room];
  //(0, 1), (1, 1), (1, 0), (1, -1)
  const offset = [
    { x: 1, y: 0 }, //가로
    { x: 1, y: 1 }, //대각선1
    { x: 0, y: 1 }, //세로
    { x: -1, y: 1 }, //대각선2
  ];

  return offset.some((dir) => {
    let streak = 1;
    const type = takes.length % 2;

    //정방향
    for (let x = stone.x + dir.x, y = stone.y + dir.y; x > 0 && x < 19 && y > 0 && y < 19; x += dir.x, y += dir.y) {
      if (takes.some((t, index) => t.x == x && t.y == y && index % 2 == type)) streak++;
      else break;
    }

    //반대방향
    for (let x = stone.x - dir.x, y = stone.y - dir.y; x > 0 && x < 19 && y > 0 && y < 19; x -= dir.x, y -= dir.y) {
      if (takes.some((t, index) => t.x == x && t.y == y && index % 2 == type)) streak++;
      else break;
    }

    if (streak === 5) {
      return true;
    }
  });
}

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
      previousWinner: "none",
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

      socket.emit("gameStart", omokGame.option);
    } else {
      omokGame.guests.push(socket.id);

      socket.join(roomId);

      io.in(roomId).emit("guestsNumberChange", omokGame.guests.length);
    }
  });

  socket.on("newStone", (stone) => {
    const { stone, username, isBlack, room } = data;
    const room = 

    let isBlackTurn = gomokuInformation[room].length % 2 == 0;

    if ((isBlackTurn && !isBlack) || (!isBlackTurn && isBlack)) return;

    if (gomokuInformation[room].find((c) => c.x === stone.x && c.y === stone.y) !== undefined) {
      return;
    }

    data = { stone, username };
    io.to(room).emit("new_stone", data);

    if (checkOmokCompleted(stone, room)) {
      omokCompleteCount += 1;
      let __currenttime__ = new Date();
      console.log(`${__currenttime__.toLocaleString()} | #${omokCompleteCount} Omok completed! in room ${room}`);

      let winner = isBlackTurn ? "black" : "white";

      io.to(room).emit("game_end", { win: winner });

      if (username === "Alice") {
        (gomokuPreviousWinner[room] = "Alice"), (gomokuScore[room][0] += 1);
      } else {
        (gomokuPreviousWinner[room] = "Bob"), (gomokuScore[room][1] += 1);
      }

      io.to(room).emit("alert_score", { score: gomokuScore[room] });
    }

    gomokuInformation[room].push(stone);
  });

  socket.on("request_rematch", (data) => {
    let username = data.username;
    let room = data.room;

    gomokuRematch[room][username] = true;

    io.to(room).emit("receive_request_rematch", { username: username });

    if (gomokuRematch[room].Alice == true && gomokuRematch[room].Bob == true) {
      io.to(room).emit("rematch", { white: gomokuPreviousWinner[room] });

      gomokuInformation[room] = [];
      // gomokuScore[room] = [0, 0];
      gomokuRematch[room] = { Alice: false, Bob: false };
    }
  });

  socket.on("countdown_over", (data) => {
    let username = data.username;
    let room = data.room;
    let isBlackTurn = data.isBlack;

    omokCompleteCount += 1;
    let __currenttime__ = new Date();
    console.log(`${__currenttime__.toLocaleString()} | #${omokCompleteCount} Omok completed! in room ${room}`);

    let winner = !isBlackTurn ? "black" : "white"; // 오목을 완성해서 이기는 경우와 반대

    io.to(room).emit("game_end", { win: winner });

    if (!(username === "Alice")) {
      // 오목을 완성해서 이기는 경우와 반대
      (gomokuPreviousWinner[room] = "Alice"), (gomokuScore[room][0] += 1);
    } else {
      (gomokuPreviousWinner[room] = "Bob"), (gomokuScore[room][1] += 1);
    }

    io.to(room).emit("alert_score", { score: gomokuScore[room] });
  });

  socket.on("disconnect", () => {
    const user = allUsers.find((user) => user.id == socket.id);
    if (user?.room) {
      gomokuRoom = user?.room;
      socket.to(gomokuRoom).emit("room_expired_opponent_disconnected");

      if (userNumber[gomokuRoom]) delete userNumber[gomokuRoom];
      allUsers = allUsers.filter((user) => user.id != socket.id);
    }
  });
});

server.listen(5000, () => "Server is running on port 5000");
