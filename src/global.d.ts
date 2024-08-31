interface Stone {
  x: number;
  y: number;
}

interface Option {
  timeOption: TimeOption;
  typeOption: TypeOption;
}

interface OmokGame {
  roomId: string;
  option: Option;
  stones: Stone[];
  p1: string;
  p2: string | null;
  score: {
    p1: number;
    p2: number;
  };
  rematch: {
    p1: boolean;
    p2: boolean;
  };
  previousWinner: "none" | "p1" | "p2";
  guests: string[];
  allUsers: string[];
}

type TimeOption = "10s" | "1min" | "infinity";
type TypeOption = "basic" | "no-color" | "no-stone";

type GameState = "idle" | "connected" | "playing" | "end" | "error";
type GameError = "room_not_exist" | "opponent_disconnected";

interface ServerToClientEvents {
  newRoomId: (roomId: string) => void;
  error: (gameError: GameError) => void;
  gameStart: (option: Option) => void;
  guestsNumberChange: (guestsNumber: number) => void;
}

interface ClientToServerEvents {
  newRoom: (option: Option) => void;
  joinRoom: (roomId: string) => void;
  newStone: (stone: Stone) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {}
