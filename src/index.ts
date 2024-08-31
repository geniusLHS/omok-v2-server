const express = require("express");
const crypto = require("crypto");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "https://omok.geniuslhs.com"],
    methods: ["GET", "POST"],
  },
});

const SUPER_BOT = "OMOK Manager";

let gomokuRoom = "";
let allUsers = [];

let gomokuInformation = {}; // Example : { foobar: { 오목판정보 } }
let gomokuScore = {}; // Example: { foobar: [1, 2]}  -> 1대2 라는 뜻
let gomokuRematch = {}; // Example: { foobar: {Alice: false, Bob: true}]}  -> Bob만 찬성
let gomokuPreviousWinner = {}; // Example: { foobar: 'Alice'}
let userNumber = {}; // Example : { foobar: 1}}

let userCount = 0;
let matchCount = 0;
let omokCompleteCount = 0;

function getKoreaTime() {
  // https://ryusm.tistory.com/141

  const now = new Date();
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const koreaTimeDiff = 9 * 60 * 60 * 1000;
  const koreaNow = new Date(utcNow + koreaTimeDiff);

  return koreaNow;
}

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
  userCount += 1;

  let __createdtime__ = getKoreaTime();

  console.log(`${__createdtime__.toLocaleString()} | #${userCount} User connected ${socket.id}`);

  socket.on("new_room", (data) => {
    let __createdtime__ = new Date();
    let randomRoomName = crypto
      .createHash("sha256")
      .update(String(__createdtime__) + "gomoku of vs")
      .digest("hex")
      .substring(0, 8);

    let username = "Alice";
    let room = randomRoomName;

    socket.join(room);
    gomokuInformation[room] = []; // 이중 리스트가 담길 예정
    gomokuScore[room] = [0, 0];
    gomokuRematch[room] = { Alice: false, Bob: false };
    gomokuPreviousWinner[room] = "";
    userNumber[room] = 1;

    io.to(room).emit("receive_roomName", room);

    gomokuRoom = room;
    allUsers.push({ id: socket.id, room });
  });

  socket.on("join_room", (data) => {
    const { username, room } = data;

    if (userNumber[room] >= 2) {
      // 이미 2명 이상이 방에 있었으면 시청할 수 없음.
      socket.emit("already_two_person"); // 새로 들어온 사람
      //   io.to(room).emit('room_expired_third_person'); // 원래 있던 사람들에게는 영향 안미침

      //   if (publicKeys[room]) delete publicKeys[room];
      //   if (userNumber[room]) delete userNumber[room];
    } else if (!gomokuInformation[room] || !userNumber[room]) {
      // 방이 없을 경우
      socket.emit("room_not_exist");

      if (gomokuInformation[room]) delete gomokuInformation[room];
      if (userNumber[room]) delete userNumber[room];
    } else {
      matchCount += 1;
      let __createdtime__ = getKoreaTime();
      console.log(`${__createdtime__.toLocaleString()} | #${matchCount} Match occured`);

      userNumber[room] += 1;

      socket.join(room);

      gomokuRoom = room;
      allUsers.push({ id: socket.id, room });

      allUsers.filter((user) => user.room == room);

      io.to(room).emit("game_start");
    }
  });

  socket.on("new_stone", (data) => {
    const { stone, username, isBlack, room } = data;

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
    let __createdtime__ = new Date();
    console.log(`${__createdtime__.toLocaleString()} | User disconnected ${socket.id}`);

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
