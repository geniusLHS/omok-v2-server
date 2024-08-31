import crypto from "crypto";

export const getRoomId = () => {
  let now = new Date();
  let roomId = crypto.createHash("sha256").update(now.toString()).digest("hex").substring(0, 8);

  return roomId;
};

export const isOmokGameEnd = (stones: Stone[], lastStone: Stone): boolean => {
  //(0, 1), (1, 1), (1, 0), (1, -1)
  const offset = [
    { x: 1, y: 0 }, //가로
    { x: 1, y: 1 }, //대각선1
    { x: 0, y: 1 }, //세로
    { x: -1, y: 1 }, //대각선2
  ];

  return offset.some((dir) => {
    let streak = 1;
    const type = stones.length % 2;

    //정방향
    for (let x = lastStone.x + dir.x, y = lastStone.y + dir.y; x > 0 && x < 19 && y > 0 && y < 19; x += dir.x, y += dir.y) {
      if (stones.some((t, index) => t.x == x && t.y == y && index % 2 == type)) streak++;
      else break;
    }

    //반대방향
    for (let x = lastStone.x - dir.x, y = lastStone.y - dir.y; x > 0 && x < 19 && y > 0 && y < 19; x -= dir.x, y -= dir.y) {
      if (stones.some((t, index) => t.x == x && t.y == y && index % 2 == type)) streak++;
      else break;
    }

    if (streak === 5) {
      return true;
    }
  });
};
