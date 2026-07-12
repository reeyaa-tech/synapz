import 'dotenv/config'; // ⚡ Crucial: Must be at the very top to load your GEMINI_API_KEY
import express from 'express';
import cors from 'cors';
import { createServer } from 'http'; 
import { Server } from 'socket.io';
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Setup HTTP server + Socket.io backend
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"]
  }
});

// Initialize Gemini API
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_FALLBACK_KEY_HERE");

// ==========================================
// DB & UTILITY CONFIGURATION
// ==========================================
const roomGameStates = {}; 

// Blueprint schema using official uppercase Types for the SDK
const QuizSchema = {
  type: "OBJECT",
  properties: {
    question: { type: "STRING", description: "A technical question or code block snippet." },
    options: { type: "ARRAY", items: { type: "STRING" }, description: "Exactly 4 multiple-choice options." },
    correctAnswerIndex: { type: "INTEGER", description: "Zero-based index (0-3) of the correct answer." }
  },
  required: ["question", "options", "correctAnswerIndex"]
};

// Helper function to query Gemini and return strict JSON data
async function generateGeminiQuizQuestion(category) {
  try {
    const model = ai.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: QuizSchema,
        temperature: 0.7,
      },
    });

    const prompt = `Generate a challenging multiple choice quiz question for the category/arena: ${category}.`;
    const result = await model.generateContent(prompt);
    
    let textResponse = result.response.text().trim();
    
    if (textResponse.startsWith("```")) {
      textResponse = textResponse.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    console.log("🎯 Cleaned JSON String from Gemini:", textResponse);
    return JSON.parse(textResponse);

  } catch (error) {
    console.error("❌ Gemini Generation Error Details:", error); 
    return {
      question: `What is a primary baseline rule when developing in ${category}?`,
      options: ["Isolate global scope states", "Mutate state directly", "Hardcode secure credentials", "Skip component cleanups"],
      correctAnswerIndex: 0
    };
  }
}

// Pure JavaScript Question Fetching & Round Pipeline Engine
async function fetchNextGeminiQuestion(roomCode, category) {
  const gameState = roomGameStates[roomCode];
  if (!gameState) return;

  try {
    console.log(`🤖 [Round ${gameState.questionCount}/10] Fetching question for category: ${category}`);
    const liveQuestion = await generateGeminiQuizQuestion(category);
    
    if (liveQuestion && roomGameStates[roomCode]) {
      // Inject current round metadata safely into the object
      liveQuestion.roundNumber = gameState.questionCount;

      gameState.preFetchedQuestion = liveQuestion;
      gameState.currentCorrectIndex = liveQuestion.correctAnswerIndex;

      console.log(`📡 Emitting Question for Round ${gameState.questionCount} to Room: ${roomCode}. Correct Index is: ${liveQuestion.correctAnswerIndex}`);
      io.to(roomCode).emit('next-question', liveQuestion);
    }
  } catch (err) {
    console.error("❌ Gemini round iteration fetch error:", err);
  }
}

// ==========================================
// WEBSOCKET ORCHESTRATION
// ==========================================
io.on('connection', (socket) => {
  console.log(`👤 Player connected: ${socket.id}`);

  // 1. Join Room (Lobby management)
  socket.on('join_room', ({ roomCode }) => {
    socket.join(roomCode);
    console.log(`👤 Socket ${socket.id} safely bound to room channel: ${roomCode}`);
  });

  // 2. Launch Match (Fires when host starts match)
  socket.on('host_launched_match', async (data) => {
    console.log("📡 SERVER RECEIVED 'host_launched_match' EVENT! Payload:", data);
    const { roomCode, arenaId } = data;
    const category = arenaId || "General Programming";
    
    roomGameStates[roomCode] = {
      category: category,
      scores: { host: 0, opponent: 0 },
      currentCorrectIndex: 0,
      hostSocketId: socket.id,
      preFetchedQuestion: null,
      isClientWaiting: false,
      questionCount: 1 
    };

    const matchData = { arenaId: category, difficulty: "hard", seed: Math.random(), roomCode };
    io.to(roomCode).emit('match_loading_start', matchData);

    await fetchNextGeminiQuestion(roomCode, category);
  });

  // 3. Arena Ready (Fires when the client-side Arena screen mounts)
  socket.on('arena_ready', (data) => {
    const { roomCode } = data;
    const gameState = roomGameStates[roomCode];

    if (!gameState) {
      console.log(`⚠️ No active game state found for room: ${roomCode}`);
      return;
    }

    if (gameState.preFetchedQuestion) {
      console.log(`🚀 Delivering already-cached Gemini question to room: ${roomCode}`);
      io.to(roomCode).emit('next-question', gameState.preFetchedQuestion);
    } else {
      console.log(`⏳ Gemini is still generating. Holding client in waiting queue for room: ${roomCode}`);
      gameState.isClientWaiting = true;
    }
  });

  // 4. Submit Answer (Processes score payload updates and cycles rounds up to 10)
  socket.on('submit_answer', async (data) => {
    const { roomCode, selectedIndex, points } = data; 
    const gameState = roomGameStates[roomCode];

    if (!gameState) {
      console.log(`⚠️ Answer submitted, but no game state found for room: ${roomCode}`);
      return;
    }

    console.log(`📥 Answer Received! User chose option index: ${selectedIndex}. True correct index was: ${gameState.currentCorrectIndex}`);

    const isHost = socket.id === gameState.hostSocketId;
    if (isHost) {
      gameState.scores.host += points || 0;
      console.log(`🏆 Host score updated: ${gameState.scores.host}`);
    } else {
      gameState.scores.opponent += points || 0;
      console.log(`🏆 Opponent score updated: ${gameState.scores.opponent}`);
    }

    // Sync scoreboard standings instantly
    io.to(roomCode).emit('score-update', {
      player: isHost ? gameState.scores.host : gameState.scores.opponent,
      opponent: isHost ? gameState.scores.opponent : gameState.scores.host
    });

    // 🔄 Round Cycle Manager
    if (gameState.questionCount < 10) {
      gameState.questionCount += 1;
      gameState.preFetchedQuestion = null; 

      // 4-second delay so users see their color feedback before moving on
      setTimeout(async () => {
        console.log(`⏰ Delay complete. Launching round ${gameState.questionCount}...`);
        await fetchNextGeminiQuestion(roomCode, gameState.category);
      }, 4000);

    } else {
      // 🏆 Final round reached! Trigger end game screen
      setTimeout(() => {
        io.to(roomCode).emit('game_over', { finalScores: gameState.scores });
        delete roomGameStates[roomCode]; 
        console.log(`🧹 Room memory for code ${roomCode} successfully cleaned.`);
      }, 4000);
    }
  });

  // 5. Handle Disconnects
  socket.on('disconnect', () => {
    console.log(`❌ Mind disconnected: ${socket.id}`);
  });
});

// ==========================================
// HTTP REST ROUTES
// ==========================================
app.get('/', (req, res) => {
  res.send('🔥 Synapz Backend is pumping out data!');
});

httpServer.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));