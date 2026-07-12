import { useState, useEffect, useRef } from 'react';
// import { socket } from './socket'; // Up-to-date modular link
import { RoomSetup, GameLobby, MatchLoadingScreen, ActiveGameArena } from './pages/CategorySelection';
import './index.css';

/* const categories = [
  { id: "programming", emoji: "💻", label: "Code Clash" },
  { id: "science", emoji: "🔬", label: "Lab Wars" },
  { id: "movies", emoji: "🎬", label: "CineStorm" },
  { id: "gk", emoji: "🌍", label: "World Rush" },
]; */

interface Star {
  element: HTMLDivElement;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  repelX: number;
  repelY: number;
}

// Shared Background Animation Component
function StarfieldBackground() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<Star[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const starCount = 150;
    const repelRadius = 150;
    let animationId: number;

    const initStars = () => {
      container.innerHTML = '';
      starsRef.current = [];
      const width = window.innerWidth;
      const height = window.innerHeight;

      for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.style.position = 'absolute';
        star.style.background = 'white';
        star.style.borderRadius = '50%';
        star.style.pointerEvents = 'none';

        const size = Math.random() * 2 + 1;
        const initialX = Math.random() * width;
        const initialY = Math.random() * height;

        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.opacity = String(Math.random() * 0.7 + 0.3);

        const starObj: Star = {
          element: star,
          baseX: initialX,
          baseY: initialY,
          x: initialX,
          y: initialY,
          vx: (Math.random() - 0.5) * 0.2,
          vy: (Math.random() - 0.5) * 0.2,
          repelX: 0,
          repelY: 0
        };

        star.style.left = `${starObj.x}px`;
        star.style.top = `${starObj.y}px`;
        container.appendChild(star);
        starsRef.current.push(starObj);
      }
    };

    const updateStars = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      starsRef.current.forEach(star => {
        star.baseX += star.vx;
        star.baseY += star.vy;

        if (star.baseX < 0) star.baseX = width;
        if (star.baseX > width) star.baseX = 0;
        if (star.baseY < 0) star.baseY = height;
        if (star.baseY > height) star.baseY = 0;

        const dx = mouseRef.current.x - star.baseX;
        const dy = mouseRef.current.y - star.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        let targetRepelX = 0;
        let targetRepelY = 0;

        if (distance < repelRadius) {
          const force = (repelRadius - distance) / repelRadius;
          const angle = Math.atan2(dy, dx);
          targetRepelX = -Math.cos(angle) * force * 60;
          targetRepelY = -Math.sin(angle) * force * 60;
        }

        star.repelX += (targetRepelX - star.repelX) * 0.1;
        star.repelY += (targetRepelY - star.repelY) * 0.1;

        star.x = star.baseX + star.repelX;
        star.y = star.baseY + star.repelY;

        star.element.style.left = `${star.x}px`;
        star.element.style.top = `${star.y}px`;
      });

      animationId = requestAnimationFrame(updateStars);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleResize = () => {
      initStars();
    };

    initStars();
    updateStars();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <div ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none" />;
}

// ==========================================
// CORE APP ROUTER/ORCHESTRATOR
// ==========================================
export default function App() {
  const [screen, setScreen] = useState<"setup" | "lobby" | "loading" | "arena">("setup");
  const [roomDetails, setRoomDetails] = useState({ username: "", arena: "", difficulty: "", roomCode: "SYNAPZ-AS79HL"});

  return (
    <div className="relative min-h-screen w-full bg-black flex items-center justify-center text-white font-sans overflow-hidden select-none">
      {/* Keeping your favorite background animation safe and sound */}
      <StarfieldBackground />
      
      {screen === "setup" && (
        <RoomSetup onCreateRoom={(user, arena, diff) => {
          setRoomDetails({ username: user, arena, difficulty: diff, roomCode: "SYNAPZ-AS79HL" });
          setScreen("lobby");
        }} />
      )}

      {screen === "lobby" && (
        <GameLobby 
          roomCode={roomDetails.roomCode}
          chosenCategory={roomDetails.arena}
          isHost={true} // Defaults to true for the room creator
          username={roomDetails.username}
          onLaunchStart={() => setScreen("loading")} 
        />
      )}

      {screen === "loading" && (
        <MatchLoadingScreen
          gameData={roomDetails} 
          onCountdownComplete={() => setScreen("arena")} 
        />
      )}

      {screen === "arena" && (
        <ActiveGameArena 
          gameData={roomDetails} 
          onMatchExit={() => setScreen("setup")} 
        />
      )}
    </div>
  );
}