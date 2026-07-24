import { useEffect, useState, useRef } from 'react';
import { socket } from '../socket';
(window as any).socket = socket;
import confetti from 'canvas-confetti';

const categories = [
  { id: "programming", emoji: "💻", label: "Code Clash" },
  { id: "science", emoji: "🔬", label: "Lab Wars" },
  { id: "movies", emoji: "🎬", label: "CineStorm" },
  { id: "gk", emoji: "🌍", label: "World Rush" },
];

const generateRandomRoomCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

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
  const [activeCode] = useState<string>(roomCode || generateRandomRoomCode());
  const [copied, setCopied] = useState(false);
  
  // 📜 Rules Modal State
  const [showRulesModal, setShowRulesModal] = useState(false);

  useEffect(() => {
    if (!activeCode) return;
    console.log(`📡 Sending join_room request for code: ${activeCode}`);
    socket.emit('join_room', { roomCode: activeCode });
  }, [activeCode]);

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

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code: ', err);
    }
  };

  // Triggers when host accepts rules inside the popup
  const handleConfirmStart = () => {
    setShowRulesModal(false);
    setIsLaunching(true); 
    (window as any).currentRoomCode = activeCode;

    console.log("📤 Emitting 'host_launched_match':", { roomCode: activeCode, arenaId: chosenCategory });
    socket.emit('host_launched_match', { 
      roomCode: activeCode,
      arenaId: chosenCategory || "programming",
    });
  };

  return (
    <div className="text-white flex items-center justify-center min-h-screen w-full bg-black p-6">
      <div id="lobby-container" className="w-full max-w-3xl p-8 border border-zinc-800/60 rounded-3xl bg-zinc-950/40 backdrop-blur-md shadow-2xl flex flex-col gap-5">
        <h2 className="text-3xl font-extrabold text-center">Game Lobby</h2>
        
        <div className="flex items-center justify-between p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl my-2">
          <div className="flex flex-col text-left">
            <span className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Room Code</span>
            <span className="text-2xl font-mono font-bold text-purple-400 tracking-wider">{activeCode}</span>
          </div>

          <button
            onClick={handleCopyCode}
            className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
              copied
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
            }`}
          >
            {copied ? '✓ Copied' : '📋 Copy Code'}
          </button>
        </div>

        <div className="flex flex-col gap-2 my-2">
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between">
            <span>{username || "Player 1"}</span> <span className="text-purple-400 font-bold">HOST</span>
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex justify-between">
            <span>Player 2</span> <span className="text-green-400">Ready</span>
          </div>
        </div>

        {/* View Rules Button */}
        <button
          onClick={() => setShowRulesModal(true)}
          className="w-full py-2.5 text-xs font-semibold text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 rounded-xl transition-all"
        >
          📖 Read Match Rules & Point System
        </button>

        {isHost ? (
          <button
            onClick={() => setShowRulesModal(true)} // Opens Pop-up
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

      {/* 📜 RULES POPUP MODAL */}
      <QuizRulesModal 
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
        onConfirm={handleConfirmStart}
        isHost={isHost}
      />
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
// RULES & REGULATIONS MODAL
// ==========================================
interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isHost?: boolean;
}

export function QuizRulesModal({ isOpen, onClose, onConfirm, isHost }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-zinc-950 border border-zinc-800 p-6 md:p-8 rounded-3xl max-w-lg w-full text-white shadow-2xl flex flex-col gap-6 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-block px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-widest mb-2">
            Match Protocol
          </div>
          <h2 className="text-2xl font-black tracking-wide">Rules & Regulations</h2>
          <p className="text-zinc-400 text-xs mt-1">Review arena constraints before initialization</p>
        </div>

        {/* Rules List */}
        <div className="flex flex-col gap-3 text-sm">
          
          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-start gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <p className="font-bold text-white text-xs">Round Structure</p>
              <p className="text-zinc-400 text-xs mt-0.5">10 synchronized rounds total. Every question is dynamically generated by AI.</p>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-start gap-3">
            <span className="text-xl">⏱️</span>
            <div>
              <p className="font-bold text-white text-xs">Time Limit & Scoring</p>
              <p className="text-zinc-400 text-xs mt-0.5">
                You have <strong className="text-purple-400">30 seconds</strong> per round. <br />
                • Correct Answer: <strong className="text-green-400">100 base pts + timeLeft</strong><br />
                • Incorrect / Time Out: <strong className="text-red-400">0 pts</strong>.
              </p>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-start gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="font-bold text-white text-xs">Single Submission</p>
              <p className="text-zinc-400 text-xs mt-0.5">Selections are instant and locked upon clicking. No takebacks!</p>
            </div>
          </div>

          <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex items-start gap-3">
            <span className="text-xl">⚔️</span>
            <div>
              <p className="font-bold text-white text-xs">Real-Time Sync</p>
              <p className="text-zinc-400 text-xs mt-0.5">Both players progress together. Round advances 4s after answer reveals.</p>
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-bold text-xs text-zinc-300 transition-all"
          >
            Cancel
          </button>
          
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]"
          >
            {isHost ? "Accept & Launch" : "I'm Ready"}
          </button>
        </div>

      </div>
    </div>
  );
}


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
  
  // 🚪 State for Leave Confirmation Modal
  const [showLeaveModal, setShowLeaveModal] = useState<boolean>(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 🎊 1. CONFETTI EFFECT (Moved inside the component)
  useEffect(() => {
    if (isGameOver && playerScore > opponentScore) {
      // Center Initial Burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Side Stream Burst for 2 seconds
      const duration = 2 * 1000;
      const animationEnd = Date.now() + duration;
      const colors = ['#4ade80', '#a855f7', '#ec4899', '#3b82f6'];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors
        });

        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };

      frame();
    }
  }, [isGameOver, playerScore, opponentScore]);

  // Clock Countdown logic
  useEffect(() => {
    if (hasAnswered) return;

    if (timeLeft === 0) {
      setHasAnswered(true);
      setSelectedAnswerIndex(-1);
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

  // WebSocket listeners
  useEffect(() => {
    const handleNextQuestion = (questionData: any) => {
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

    const handleGameOver = (_data: any) => {
      setIsGameOver(true);
    };

    socket.on('next-question', handleNextQuestion);
    socket.on('score-update', handleScoreUpdate);
    socket.on('game_over', handleGameOver);

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
    const pointsEarned = isCorrect ? 100 + timeLeft : 0;

    socket.emit('submit_answer', {
      roomCode: gameData?.roomCode || (window as any).currentRoomCode,
      selectedIndex: index,
      points: pointsEarned
    });
  };

  const confirmLeave = () => {
    socket.emit('leave_room', { roomCode: gameData?.roomCode || (window as any).currentRoomCode });
    onMatchExit();
  };

  // Game Over Victory / Defeat Screen
  if (isGameOver) {
    const isWinner = playerScore > opponentScore;
    const isTie = playerScore === opponentScore;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6 text-white select-none">
        <div className="glass-card max-w-md w-full mx-auto p-8 bg-zinc-950 border border-zinc-800 text-center rounded-3xl shadow-2xl relative overflow-hidden">
          
          {/* Background Ambient Glow */}
          <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${isWinner ? 'bg-green-500' : 'bg-purple-500'}`} />
          
          {isWinner ? (
            <>
              <h2 className="text-5xl font-black text-green-400 tracking-wider mb-2 drop-shadow-[0_0_25px_rgba(74,222,128,0.5)] animate-pulse">
                YOU WON!!
              </h2>
              <p className="text-zinc-400 text-sm mb-6">Fantastic performance in the arena!</p>
            </>
          ) : isTie ? (
            <>
              <h2 className="text-3xl font-black text-amber-400 tracking-wider mb-2">
                IT'S A TIE!
              </h2>
              <p className="text-zinc-400 text-sm mb-6">Neck and neck till the very end.</p>
            </>
          ) : (
            <>
              <h2 className="text-3xl font-black text-red-400 tracking-wider mb-2">
                MATCH OVER
              </h2>
              <p className="text-zinc-400 text-sm mb-6">Good effort! Try again to claim victory.</p>
            </>
          )}

          {/* Final Scoreboard Breakdown */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl mb-6 flex justify-around items-center">
            <div>
              <span className="text-xs text-zinc-500 uppercase font-semibold">Your Score</span>
              <p className="text-2xl font-black text-purple-400">{playerScore}</p>
            </div>
            <div className="h-8 w-[1px] bg-zinc-800" />
            <div>
              <span className="text-xs text-zinc-500 uppercase font-semibold">Opponent</span>
              <p className="text-2xl font-black text-pink-400">{opponentScore}</p>
            </div>
          </div>

          <button 
            onClick={onMatchExit} 
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-bold tracking-wider transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)]"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="fixed inset-0 text-white flex flex-col items-center justify-start w-full h-full bg-transparent p-4 md:p-6 overflow-y-auto">
      <div className="glass-card max-w-3xl w-full mx-auto p-6 bg-zinc-950/40 backdrop-blur-md rounded-3xl border border-zinc-800/60 text-white my-auto flex flex-col gap-4 relative">
        
        <div className="flex justify-between items-center w-full mb-2">
          <span className="text-purple-400 font-bold uppercase tracking-wider text-sm">
            Active Battle {currentQuestion?.roundNumber ? `— Round ${currentQuestion.roundNumber}/10` : ""}
          </span>
          <button 
            onClick={() => setShowLeaveModal(true)} 
            className="py-2 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm hover:border-red-500/50 hover:bg-red-500/10 text-zinc-300 hover:text-red-400 transition-all"
          >
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

        {/* Interactive Question Panel */}
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
          </div>
        )}

      </div>

      {/* Leave Match Confirmation Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl flex flex-col gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
              ⚠️
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Leave Match?</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Leaving now will forfeit your current progress and exit the arena.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowLeaveModal(false)}
                className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl font-semibold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmLeave}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-semibold text-sm transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                Confirm Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}