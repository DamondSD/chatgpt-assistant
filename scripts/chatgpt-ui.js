// ==============================
// ChatGPT UI Class
// ==============================
class ChatGPTUI extends Application {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "chatgpt-ui",
      title: "ChatGPT Assistant",
      template: "modules/chatgpt-assistant/templates/chatgpt-ui.html",
      width: 800,
      height: 500,
      resizable: true
    });
  }

  async getData(options = {}) {
    console.log("📦 ChatGPTUI getData() called");
    return {};
  }
}

// ==============================
// UI Render Hook
// ==============================
Hooks.on("renderChatGPTUI", (app, html) => {
  console.log("🧪 ChatGPT UI rendered.");

  const sendButton = html[0].querySelector("#chatgpt-send");
  const textarea = html[0].querySelector("#prompt");
  const npcSelect = html[0].querySelector("#npc-select");
  const output = html[0].querySelector("#chatgpt-output");

  if (!sendButton || !textarea || !npcSelect) {
    console.warn("⚠️ Missing elements in ChatGPT UI.");
    return;
  }

  // Clear dropdown and add default "None" option
  npcSelect.innerHTML = "";
  const noneOption = document.createElement("option");
  noneOption.value = "";
  noneOption.text = "None";
  npcSelect.appendChild(noneOption);

  // Populate dropdown with journal entries in NPC Memories folder
  const memoryFolder = game.folders.find(f => f.name === "NPC Memories" && f.type === "JournalEntry");
  if (memoryFolder) {
    const memoryJournals = memoryFolder.contents;
    memoryJournals.forEach(journal => {
      const option = document.createElement("option");
      option.value = journal.name;
      option.text = journal.name;
      npcSelect.appendChild(option);
    });
  }

  sendButton.addEventListener("click", async () => {
    const query = textarea.value.trim();
    const npcName = npcSelect.value || null;
    const model = game.settings.get("chatgpt-assistant", "gptModel") || "gpt-4o";
    const whisperToGM = game.settings.get("chatgpt-assistant", "whisperToGM");

    if (!query) return;

    // Show user question in chat
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker(),
      content: `<strong>You asked ChatGPT:</strong> ${query}`,
      whisper: whisperToGM ? ChatMessage.getWhisperRecipients("GM") : undefined
    });

    // Send to API
    const reply = await window.handleGPTQuery(query, npcName, model);

    // Show reply in chat
    await ChatMessage.create({
      speaker: { alias: "ChatGPT" },
      content: reply,
      whisper: whisperToGM ? ChatMessage.getWhisperRecipients("GM") : undefined
    });

    // Display in GUI output box
    if (output) {
      output.innerHTML = reply;
    }

    textarea.value = "";
  });
});

// ==============================
// Add Button to Chat Controls
// ==============================
Hooks.once("ready", () => {
  console.log("✅ ChatGPTUI module hook: ready");

  game.chatgptUI = new ChatGPTUI();

  const waitForChatControls = () => {
    const chatControls = document.querySelector("#chat-controls");

    if (!chatControls) {
      setTimeout(waitForChatControls, 100);
      return;
    }

    if (chatControls.querySelector(".chatgpt-button")) return;

    const gmOnly = game.settings.get("chatgpt-assistant", "gmOnlyButton");
    if (gmOnly && !game.user.isGM) return;

    const icon = document.createElement("a");
    icon.classList.add("chat-control-icon", "chatgpt-button");
    icon.innerHTML = `<i class="fas fa-robot"></i>`;
    icon.title = "ChatGPT Assistant";

    icon.addEventListener("click", () => {
      console.log("🤖 Robot icon clicked — rendering ChatGPT UI");
      game.chatgptUI.render(true);
    });

    chatControls.appendChild(icon);
    console.log("🤖 ChatGPT button added to chat controls.");
  };

  waitForChatControls();
});
