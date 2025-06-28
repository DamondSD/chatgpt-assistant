// chatgpt.js — complete assistant backend

Hooks.once("init", () => {
  console.log("✅ [chatgpt-assistant] Initializing ChatGPT Assistant Module");

  // Secure OpenAI API Key setting
  game.settings.register("chatgpt-assistant", "openaiApiKey", {
    name: "OpenAI API Key",
    hint: "You will not be able to view this key again after saving. Store it somewhere safe.",
    scope: "client",
    config: true,
    type: String,
    default: "",
    onChange: value => console.log("🔐 API key updated.")
  });

  // GPT Model selection
  game.settings.register("chatgpt-assistant", "gptModel", {
    name: "OpenAI Model",
    hint: "Choose the OpenAI model to use for responses.",
    scope: "client",
    config: true,
    type: String,
    choices: {
      "gpt-4o": "GPT-4o (Fastest + Multimodal)",
      "gpt-4": "GPT-4 (Accurate, slower)",
      "gpt-3.5-turbo": "GPT-3.5 Turbo (Fast & cheap)"
    },
    default: "gpt-4o"
  });

  // Toggle for whisper-to-GM
  game.settings.register("chatgpt-assistant", "whisperToGM", {
    name: "Whisper ChatGPT Replies to GM",
    hint: "If enabled, ChatGPT replies will be whispered only to the GM.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  // Toggle to show/hide robot GUI button for non-GMs
  game.settings.register("chatgpt-assistant", "gmOnlyButton", {
    name: "GM-Only Robot Button",
    hint: "Only show the ChatGPT GUI button for GMs.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });
});

Hooks.once("ready", async () => {
  console.log("🤖 [chatgpt-assistant] ChatGPT module ready");

  // 🧠 Auto-create "Helper" memory journal if missing
  const existing = game.journal.contents.find(j => j.name === "Helper" && j.folder?.name === "NPC Memories");
  if (!existing) {
    let folder = game.folders.find(f => f.name === "NPC Memories" && f.type === "JournalEntry");
    if (!folder) {
      folder = await Folder.create({ name: "NPC Memories", type: "JournalEntry", color: "#9e9e9e" });
    }

    await JournalEntry.create({
      name: "Helper",
      folder: folder.id,
      pages: [{
        name: "Helper Memory Guide",
        type: "text",
        text: {
          content: `
<h2>🤖 Helper — Your Memory Guide</h2>
<p><strong>Who I Am:</strong> I’m your friendly tutorial construct. Ask me how to use NPC memory!</p>

<h3>🛠️ Example Prompts</h3>
<ul>
  <li><code>Helper, how do I create a new memory NPC?</code></li>
  <li><code>Helper, what do I put in a memory journal?</code></li>
  <li><code>Helper, show me how Jaaris works.</code></li>
</ul>

<h3>📘 Rules of Memory Journals</h3>
<ul>
  <li>Name the journal <strong>exactly</strong> the same as the NPC</li>
  <li>Put it in the folder <code>NPC Memories</code></li>
  <li>Include background, known facts, personality traits, etc.</li>
</ul>

<p><em>Try it now by asking me something!</em></p>
          `,
          format: 1
        }
      }]
    });

    ui.notifications.info("📘 'Helper' NPC created in NPC Memories folder.");
  }

  // 💬 Slash command listener
  Hooks.on("chatMessage", (chatLog, message, chatData) => {
    if (!message.startsWith("/gpt")) return true;
    const prompt = message.slice(4).trim();
    if (!prompt) return false;

    const model = game.settings.get("chatgpt-assistant", "gptModel") || "gpt-4o";
    const whisper = game.settings.get("chatgpt-assistant", "whisperToGM");

    handleGPTCommand(prompt, null, model).then(reply => {
      ChatMessage.create({
        content: `<strong>ChatGPT:</strong> ${reply || "(No response)"}`,
        whisper: whisper ? ChatMessage.getWhisperRecipients("GM") : undefined
      });
    });

    return false;
  });
});

// Core handler shared by GUI and /gpt
async function handleGPTCommand(prompt, npcName = null, model = "gpt-4o") {
  const apiKey = game.settings.get("chatgpt-assistant", "openaiApiKey");
  if (!apiKey) {
    ui.notifications.warn("No OpenAI API key set in settings.");
    return "(No API key set)";
  }

  // 🧠 Load NPC memory from folder
  let memory = "";
  if (npcName) {
    const journal = game.journal?.contents.find(j =>
      j.name === npcName && j.folder?.name === "NPC Memories"
    );
    if (journal) {
      memory = journal.pages.contents.map(p => p.text?.content || "").join("\n");
    } else {
      console.warn(`⚠️ No memory entry found for ${npcName}`);
    }
  }

  const systemPrompt = npcName
    ? `You are roleplaying as ${npcName}, an NPC in a fantasy world. Your known memory is as follows:\n${memory}\nRespond in character.`
    : "You are a helpful and in-character fantasy assistant.";

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    return reply || "(No response)";
  } catch (err) {
    console.error("[chatgpt-assistant] API Error:", err);
    ui.notifications.error("ChatGPT API error — check console for details.");
    return "(Error retrieving response)";
  }
}

// 🔄 Expose for GUI access
document.addEventListener("DOMContentLoaded", () => {
  window.handleGPTQuery = handleGPTCommand;
});
