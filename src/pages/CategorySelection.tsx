import { useEffect, useState, useRef } from 'react';
import { socket } from '../socket';
(window as any).socket = socket;

const categories = [
  { id: "programming", emoji: "💻", label: "Code Clash" },
  { id: "science", emoji: "🔬", label: "Lab Wars" },
  { id: "movies", emoji: "🎬", label: "CineStorm" },
  { id: "gk", emoji: "🌍", label: "World Rush" },
];

// ==========================================
// SCREEN 1: ROOM SETUP / CREATION
// ==========================================
export function RoomSetup({ onCreateRoom }: { onCreateRoom: (username: string, category: string, difficulty: string) => void }) {
  const [username, setUsername] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("hard");

  return (
    <div className="text-white flex flex-col items-center justify-start min-h-screen w-full bg-black p-6 select-none overflow-y-auto">
      <div className="w-full max-w-3xl p-8 border border-zinc-800/60 rounded-3xl bg-zinc-950/40 backdrop-blur-md shadow-2xl flex flex-col gap-5 transition-all duration-300 hover:border-zinc-700/50">
        
        <div className="text-center group cursor-default">
          <h1 className="text-4xl font-extrabold tracking-wide mb-1 transition-all duration-500 ease-out group-hover:tracking-widest group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-purple-400">
            Synapz
          </h1>
          <p className="text-zinc-400 text-sm group-hover:text-zinc-300">Choose your arena</p>
        </div>

        <input
          type="text"
          placeholder="Enter Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 placeholder-zinc-600 focus:outline-none focus:border-purple-500 focus:bg-zinc-900/80 focus:shadow-[0_0_20px_rgba(168,85,247,0.15)] text-white text-sm transition-all duration-300"
        />

        <div className="grid grid-cols-2 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`group h-24 flex flex-row items-center justify-center gap-4 rounded-xl border transition-all duration-300 transform active:scale-[0.98] ${
                category === cat.id 
                  ? "bg-zinc-900/90 border-purple-500 text-white shadow-[0_0_25px_rgba(168,85,247,0.15)]" 
                  : "bg-zinc-900/10 border-zinc-900/80 text-zinc-400 hover:bg-zinc-900/50 hover:border-purple-500/40 hover:-translate-y-1 hover:text-white hover:shadow-[0_10px_25px_-10px_rgba(168,85,247,0.2)]"
              }`}
            >
              <div className="text-3xl transition-transform duration-300 ease-out group-hover:scale-125 group-hover:rotate-6 group-active:scale-95">
                {cat.emoji}
              </div>
              <p className="text-sm font-semibold tracking-wide">{cat.label}</p>
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-1">
          {["easy", "medium", "hard"].map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs capitalize border transition-all duration-200 transform active:scale-[0.96] ${
                difficulty === level 
                  ? "bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.45)]" 
                  : "bg-zinc-900/30 border-zinc-800/80 text-zinc-500 hover:bg-zinc-900/80 hover:border-zinc-600 hover:text-zinc-200"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <button 
          onClick={() => onCreateRoom(username, category, difficulty)}
          className="w-full py-4 mt-2 font-extrabold tracking-wider rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 bg-[length:200%_auto] text-white transition-all duration-500 transform hover:bg-right hover:scale-[1.01] hover:shadow-[0_0_35px_rgba(168,85,247,0.5)] active:scale-[0.99] active:duration-75"
        >
          Create Room
        </button>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN 2: GAME LOBBY
// ==========================================
interface GameLobbyProps {
  roomCode: string;
  onLaunchStart: (matchData: any) => void;
  chosenCategory?: string;
  isHost?: boolean;
  username: string;
}

export function GameLobby({ roomCode, onLaunchStart, chosenCategory, isHost = true, username }: GameLobbyProps) {
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    if (!roomCode) return;
    console.log(`📡 Sending join_room request for code: ${roomCode}`);
    socket.emit('join_room', { roomCode });
  }, [roomCode]);

  useEffect(() => {
    const handleMatchLoading = (matchData: any) => {
      console.log("🚀 Match data received from server:", matchData);
      onLaunchStart(matchData); 
    };

    socket.on('match_loading_start', handleMatchLoading);

    return () => {
      socket.off('match_loading_start', handleMatchLoading);
    };
  }, [onLaunchStart]); 

  const handleLaunchMatch = () => {
    setIsLaunching(true); 
    (window as any).currentRoomCode = roomCode;

    console.log("📤 Emitting 'host_launched_match' event with payload:", { roomCode, arenaId: chosenCategory });
    socket.emit('host_launched_match', { 
      roomCode: roomCode,
      arenaId: chosenCategory || "programming",
    });
  };

  return (
    <div className="text-white flex items-center justify-center min-h-screen w-full bg-black p-6">
      <div id="lobby-container" className="w-full max-w-3xl p-8 border border-zinc-800/60 rounded-3xl bg-zinc-950/40 backdrop-blur-md shadow-2xl flex flex-col gap-5">
        <h2 className="text-3xl font-extrabold text-center">Game Lobby</h2>
        <p className="text-center text-zinc-400">Room Code: <span className="text-purple-400 font-mono select-all">{roomCode}</span></p>
        
        <div className="flex flex-col gap-2 my-4">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between">
            <span> {username || "Player 1"}</span> <span className="text-purple-400 font-bold">HOST</span>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between">
            <span>Player 2</span> <span className="text-green-400">Ready</span>
          </div>
        </div>

        {isHost ? (
          <button
            onClick={handleLaunchMatch}
            disabled={isLaunching}
            className={`w-full py-4 font-extrabold tracking-wider rounded-xl text-white bg-purple-600 transition-all duration-300 ${
              isLaunching ? 'opacity-50 cursor-not-allowed bg-purple-800' : 'hover:bg-purple-500 hover:shadow-[0_0_25px_rgba(168,85,247,0.4)]'
            }`}
          >
            {isLaunching ? 'Launching...' : 'Launch Match'}
          </button>
        ) : (
          <div className="w-full py-4 text-center text-sm font-medium border border-zinc-800/80 bg-zinc-900/20 text-zinc-500 rounded-xl animate-pulse">
            Waiting for Host to deploy arena...
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// SCREEN 3: CINEMATIC SYNC COUNTDOWN
// ==========================================
interface LoadingScreenProps {
  onCountdownComplete: () => void;
  gameData: any;
}

export function MatchLoadingScreen({ onCountdownComplete, gameData: _gameData }: LoadingScreenProps) {
  const [countdown, setCountdown] = useState(3);
  
  useEffect(() => {
    if (countdown === 0) {
      onCountdownComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, onCountdownComplete]);

  return (
    <div className="text-white flex flex-col items-center justify-center min-h-screen bg-black select-none">
      <div className="text-center flex flex-col gap-3">
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 animate-pulse">
          Initializing Matrix Session
        </p>
        
        <div className="h-40 flex items-center justify-center">
          <h1 key={countdown} className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-purple-500 scale-100 animate-[ping_1s_ease-in-out_infinite]">
            {countdown}
          </h1>
        </div>

        <p className="text-sm font-medium tracking-wide text-zinc-400">
          Syncing neural channels for <span className="text-purple-400 font-bold">Arena Deployment</span>...
        </p>
      </div>
    </div>
  );
}

// ==========================================
// SCREEN 4: ACTIVE INTERACTIVE ARENA
// ==========================================
interface ActiveGameArenaProps {
  onMatchExit: () => void;
  gameData: {
    roomCode: string;
    arenaId?: string;
  } | null;
}

export function ActiveGameArena({ onMatchExit, gameData }: ActiveGameArenaProps) {
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [playerScore, setPlayerScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [revealedCorrectIndex, setRevealedCorrectIndex] = useState<number | null>(null);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Countdown clock loop logic
  useEffect(() => {
    if (hasAnswered) return;

    if (timeLeft === 0) {
      setHasAnswered(true);
      setSelectedAnswerIndex(-1); // Marks selection value as a manual skip trigger
      setRevealedCorrectIndex(currentQuestion?.correctAnswerIndex);

      socket.emit('submit_answer', {
        roomCode: gameData?.roomCode || (window as any).currentRoomCode,
        selectedIndex: -1,
        points: 0
      });
      return;
    }

    const timer = setTimeout(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, hasAnswered, currentQuestion, gameData]);

  // Sync WebSocket data feeds
  useEffect(() => {
    const handleNextQuestion = (questionData: any) => {
      console.log("🎯 Next round received from server:", questionData);
      
      setSelectedAnswerIndex(null);
      setRevealedCorrectIndex(null);
      setHasAnswered(false);
      setCurrentQuestion(questionData);
      setTimeLeft(30);
    };

    const handleScoreUpdate = (data: { player: number; opponent: number }) => {
      setPlayerScore(data.player);
      setOpponentScore(data.opponent);
    };

    const handleGameOver = (data: any) => {
      console.log("🏁 Match Complete! Final numbers:", data);
      setIsGameOver(true);
    };

    socket.on('next-question', handleNextQuestion);
    socket.on('score-update', handleScoreUpdate);
    socket.on('game_over', handleGameOver);

    console.log(`📡 Signaling arena_ready for room: ${gameData?.roomCode}`);
    socket.emit('arena_ready', {
      roomCode: gameData?.roomCode || (window as any).currentRoomCode
    });

    return () => {
      socket.off('next-question', handleNextQuestion);
      socket.off('score-update', handleScoreUpdate);
      socket.off('game_over', handleGameOver);
    };
  }, [gameData]);

  const handleAnswerSelection = (index: number) => {
    if (hasAnswered || !currentQuestion) return;

    setHasAnswered(true);
    setSelectedAnswerIndex(index);
    
    const correctIdx = currentQuestion.correctAnswerIndex;
    setRevealedCorrectIndex(correctIdx);

    const isCorrect = index === correctIdx;
    const pointsEarned = isCorrect ? 100 + (timeLeft * 5) : 0;

    socket.emit('submit_answer', {
      roomCode: gameData?.roomCode || (window as any).currentRoomCode,
      selectedIndex: index,
      points: pointsEarned
    });

    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 80);
  };

  if (isGameOver) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-black text-white p-6">
        <div className="glass-card max-w-md w-full mx-auto p-8 bg-zinc-950 border border-zinc-800 text-center rounded-3xl shadow-2xl">
          <h2 className="text-3xl font-black text-purple-400 mb-2">🏆 BATTLE COMPLETE</h2>
          <p className="text-zinc-400 mb-6">10 rounds processed successfully.</p>
          <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-6">
            <p className="font-bold text-lg">Your Final Score: {playerScore} pts</p>
            <p className="text-zinc-500 text-sm mt-1">Opponent Score: {opponentScore} pts</p>
          </div>
          <button onClick={onMatchExit} className="w-full py-4 bg-purple-600 rounded-xl font-bold hover:bg-purple-500 transition-all">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="fixed inset-0 text-white flex flex-col items-center justify-start w-full h-full bg-transparent p-4 md:p-6 overflow-y-auto">
      <div className="glass-card max-w-3xl w-full mx-auto p-6 bg-zinc-950/40 backdrop-blur-md rounded-3xl border border-zinc-800/60 text-white my-auto flex flex-col gap-4">
        
        <div className="flex justify-between items-center w-full mb-2">
          <span className="text-purple-400 font-bold uppercase tracking-wider text-sm">
            Active Battle {currentQuestion?.roundNumber ? `— Round ${currentQuestion.roundNumber}/10` : ""}
          </span>
          <button onClick={onMatchExit} className="py-2 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm hover:border-red-500/50 transition-all">
            Leave Match
          </button>
        </div>

        {/* Scoreboard Layout */}
        <div className="grid grid-cols-3 items-center w-full bg-white/5 border border-white/10 p-4 rounded-xl text-center">
          <div className="flex flex-col items-start pl-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">You</span>
            <span className="text-2xl font-black text-purple-400">{playerScore} pts</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xs text-gray-500 uppercase tracking-widest mb-1">Time Left</span>
            <div className={`text-xl font-mono font-bold px-3 py-1 rounded-full border ${
              timeLeft <= 10 && !hasAnswered ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : 'bg-white/5 text-gray-200 border-white/10'
            }`}>
              {timeLeft}s
            </div>
          </div>
          <div className="flex flex-col items-end pr-2">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Opponent</span>
            <span className="text-2xl font-black text-pink-400">{opponentScore} pts</span>
          </div>
        </div>

        {/* Interactive Panel */}
        {currentQuestion && (
          <div className="flex flex-col gap-5 w-full text-left">
            <p className="text-lg text-white font-medium bg-white/5 p-4 rounded-xl border border-white/10">
              {currentQuestion.question}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {currentQuestion.options.map((option: string, index: number) => {
                const isSelected = selectedAnswerIndex === index;
                const isCorrectAnswer = revealedCorrectIndex === index;
                
                let buttonStyle = "border-zinc-800/80 bg-zinc-900/40 hover:border-purple-500 hover:bg-white/5";
                
                if (hasAnswered) {
                  if (isCorrectAnswer) {
                    buttonStyle = "border-green-500 bg-green-500/20 text-green-300 font-bold";
                  } else if (isSelected) {
                    buttonStyle = "border-red-500 bg-red-500/20 text-red-300 font-bold";
                  } else {
                    buttonStyle = "border-zinc-900 bg-zinc-950/20 opacity-30 cursor-not-allowed";
                  }
                }

                return (
                  <button
                    key={index}
                    disabled={hasAnswered}
                    className={`text-left transition-all p-4 rounded-xl border ${buttonStyle}`}
                    onClick={() => handleAnswerSelection(index)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{option}</span>
                      {hasAnswered && isCorrectAnswer && <span className="text-xs bg-green-500/20 px-2 py-0.5 rounded border border-green-500/30">✓</span>}
                      {hasAnswered && isSelected && !isCorrectAnswer && <span className="text-xs bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">✗</span>}
                    </div>
                  </button>
                );
              })}
            </div>

            {hasAnswered && (
              <div className="mt-6 p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-center">
                {selectedAnswerIndex === -1 ? (
                  <>
                    <div className="text-amber-500 font-bold text-lg"> Time's Up! </div>
                    <p className="text-zinc-500 text-sm">Moving to next round sequence...</p>
                  </>
                ) : selectedAnswerIndex === revealedCorrectIndex ? (
                  <>
                    <div className="text-green-500 font-bold text-lg">🔥 Correct!</div>
                    <p className="text-zinc-500 text-sm">Moving to the next question...</p>
                  </>
                ) : (
                  <>
                    <div className="text-red-500 font-bold text-lg">❌ Incorrect Answer! 0 pts.</div>
                    <p className="text-zinc-500 text-sm">Moving to the next question...</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}