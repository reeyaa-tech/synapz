import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import { createServer } from 'http'; 
import { Server } from 'socket.io';
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173", 
    methods: ["GET", "POST"]
  }
});

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "YOUR_KEY_HERE");

const roomGameStates = {}; 

const QuizSchema = {
  type: "OBJECT",
  properties: {
    question: { type: "STRING", description: "A technical question or code block snippet." },
    options: { type: "ARRAY", items: { type: "STRING" }, description: "Exactly 4 multiple-choice options." },
    correctAnswerIndex: { type: "INTEGER", description: "Zero-based index (0-3) of the correct answer." }
  },
  required: ["question", "options", "correctAnswerIndex"]
};

// Fixed variable declaration conflict inside prompt generation
async function generateGeminiQuizQuestion(category, askedQuestions = []) {
  try {
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash", 
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: QuizSchema,
        temperature: 0.9,
      },
    });

    let exclusionText = "";
    if (askedQuestions.length > 0) {
      exclusionText = ` DO NOT repeat any of these previously asked questions:\n- ${askedQuestions.join("\n- ")}`;
    }

    const quizPrompt = `Generate a unique, challenging multiple choice quiz question for the category/arena: ${category}.${exclusionText}`;
    
    const result = await model.generateContent(quizPrompt);
    let textResponse = result.response.text().trim();
    
    if (textResponse.startsWith("```")) {
      textResponse = textResponse.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }

    console.log("🎯 Cleaned JSON String from Gemini:", textResponse);
    return JSON.parse(textResponse);

  } catch (error) {
    console.error("❌ Gemini Generation Error Details:", error); 
    return {
      question: `Q${askedQuestions.length + 1}: What is a primary baseline rule when developing in ${category}?`,
      options: ["Isolate global scope states", "Mutate state directly", "Hardcode secure credentials", "Skip component cleanups"],
      correctAnswerIndex: 0
    };
  }
}

async function fetchNextGeminiQuestion(roomCode, category) {
  const gameState = roomGameStates[roomCode];
  if (!gameState) return;

  try {
    console.log(`[Round ${gameState.questionCount}/10] Fetching question for category: ${category}`);
    const liveQuestion = await generateGeminiQuizQuestion(category, gameState.askedQuestions || []);
    
    if (liveQuestion && roomGameStates[roomCode]) {
      if (!gameState.askedQuestions) gameState.askedQuestions = [];
      gameState.askedQuestions.push(liveQuestion.question);

      liveQuestion.roundNumber = gameState.questionCount;
      gameState.preFetchedQuestion = liveQuestion;
      gameState.currentCorrectIndex = liveQuestion.correctAnswerIndex;

      console.log(`Emitting Question for Round ${gameState.questionCount} to Room: ${roomCode}. Correct Index is: ${liveQuestion.correctAnswerIndex}`);
      io.to(roomCode).emit('next-question', liveQuestion);
    }
  } catch (err) {
    console.error("Gemini round iteration fetch error:", err);
  }
}

io.on('connection', (socket) => {
  console.log(`👤 Player connected: ${socket.id}`);

  socket.on('join_room', ({ roomCode }) => {
    socket.join(roomCode);
    console.log(`👤 Socket ${socket.id} safely bound to room channel: ${roomCode}`);
  });

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
      questionCount: 1,
      answeredPlayers: new Set(),
      askedQuestions: [] 
    };

    const matchData = { arenaId: category, difficulty: "hard", seed: Math.random(), roomCode };
    io.to(roomCode).emit('match_loading_start', matchData);

    await fetchNextGeminiQuestion(roomCode, category);
  });

  socket.on('arena_ready', (data) => {
    const { roomCode } = data;
    const gameState = roomGameStates[roomCode];

    if (!gameState) {
      console.log(`⚠️ No active game state found for room: ${roomCode}`);
      return;
    }

    if (gameState.preFetchedQuestion) {
      console.log(`🚀 Delivering pre-fetched Gemini question to room: ${roomCode}`);
      io.to(roomCode).emit('next-question', gameState.preFetchedQuestion);
    } else {
      gameState.isClientWaiting = true;
    }
  });

  socket.on('submit_answer', async (data) => {
    const { roomCode, selectedIndex, points } = data; 
    const gameState = roomGameStates[roomCode];

    if (!gameState) {
      console.log(`⚠️ Answer submitted, but no game state found for room: ${roomCode}`);
      return;
    }

    if (!gameState.answeredPlayers) {
      gameState.answeredPlayers = new Set();
    }

    // Guard against duplicate answer submissions from the same socket in a single round
    if (gameState.answeredPlayers.has(socket.id)) return;
    gameState.answeredPlayers.add(socket.id);

    console.log(`📥 Answer Received from ${socket.id}! Index: ${selectedIndex}`);

    const isHost = socket.id === gameState.hostSocketId;
    if (isHost) {
      gameState.scores.host += points || 0;
    } else {
      gameState.scores.opponent += points || 0;
    }

    io.to(roomCode).emit('score-update', {
      player: isHost ? gameState.scores.host : gameState.scores.opponent,
      opponent: isHost ? gameState.scores.opponent : gameState.scores.host
    });

    // Detect active connected players in room dynamically
    const clientsInRoom = io.sockets.adapter.rooms.get(roomCode);
    const totalPlayersInRoom = clientsInRoom ? clientsInRoom.size : 1;

    // Wait until ALL connected room participants have submitted their answer
    if (gameState.answeredPlayers.size < totalPlayersInRoom) {
      console.log(`⏳ Waiting for all active players to answer (${gameState.answeredPlayers.size}/${totalPlayersInRoom})...`);
      return; 
    }

    // Reset tracker for next round cycle
    gameState.answeredPlayers.clear();

    // 4-second buffer delay before triggering next round
    setTimeout(async () => {
      if (gameState.questionCount < 10) {
        gameState.questionCount += 1;
        gameState.preFetchedQuestion = null; 
        console.log(`⏰ Delay complete. Launching round ${gameState.questionCount}...`);
        await fetchNextGeminiQuestion(roomCode, gameState.category);
      } else {
        io.to(roomCode).emit('game_over', { finalScores: gameState.scores });
        delete roomGameStates[roomCode]; 
        console.log(`🧹 Room memory for code ${roomCode} successfully cleaned.`);
      }
    }, 4000);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Mind disconnected: ${socket.id}`);
  });
});

app.get('/', (req, res) => {
  res.send('🔥 Synapz Backend is pumping out data!');
});

httpServer.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));