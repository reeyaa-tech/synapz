import { useState } from "react";
import CategorySelection from "./pages/CategorySelection";

function App() {
  return <CategorySelection />;
}

const categories = [
  { id: "programming", emoji: "💻", label: "Code Clash" },
  { id: "science", emoji: "🔬", label: "Lab Wars" },
  { id: "movies", emoji: "🎬", label: "CineStorm" },
  { id: "gk", emoji: "🌍", label: "World Rush" },
];

export default function CategorySelection() {
  const [username, setUsername] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("easy");

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="w-full max-w-xl p-8 rounded-3xl bg-zinc-900 border border-zinc-800">
        <h1 className="text-4xl font-bold text-center mb-2">
          Synapz
        </h1>

        <p className="text-center text-zinc-400 mb-6">
          Choose your arena
        </p>

        <input
          type="text"
          placeholder="Enter Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 rounded-xl bg-zinc-800 border border-zinc-700 mb-6"
        />

        <div className="grid grid-cols-2 gap-4">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`p-4 rounded-xl border transition ${
                category === cat.id
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-zinc-700"
              }`}
            >
              <div className="text-3xl">{cat.emoji}</div>
              <p>{cat.label}</p>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          {["easy", "medium", "hard"].map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`px-4 py-2 rounded-lg ${
                difficulty === level
                  ? "bg-purple-600"
                  : "bg-zinc-800"
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <button className="w-full py-4 mt-2 font-bold tracking-wider rounded-xl bg-gradient-to-r from-zinc-900 via-neutral-800 to-zinc-900 border border-zinc-800 bg-[length:200%_auto] text-zinc-100 transition-all duration-300 transform hover:bg-right hover:scale-[1.005] hover:border-zinc-700 hover:shadow-[0_0_20px_rgba(255,255,255,0.08)] active:scale-[0.995]">
          ⚡ Create Room
        </button>
      </div>
    </div>
  );
}

export default App;
