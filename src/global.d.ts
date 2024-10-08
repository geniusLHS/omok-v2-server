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
  isP1Black: boolean;
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
  gameStart: (option: Option, isP1Black: boolean) => void;
  guestsNumberChange: (guestsNumber: number) => void;
  newStone: (stone: Stone) => void;
  gameEnd: (
    isP1Win: boolean,
    score: {
      p1: number;
      p2: number;
    }
  ) => void;
  requestRematch: (rematch: { p1: boolean; p2: boolean }) => void;
}

interface ClientToServerEvents {
  newRoom: (option: Option) => void;
  joinRoom: (roomId: string) => void;
  newStone: (stone: Stone) => void;
  requestRematch: () => void;
  timeOut: () => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {}
