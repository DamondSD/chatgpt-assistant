Hooks.once("init", () => {
  console.log("⚙️ Initializing ChatGPT Assistant module");

  game.settings.register("chatgpt-assistant", "openaiApiKey", {
    name: "OpenAI API Key",
    hint: "Paste your OpenAI API key here to enable GPT responses.",
    scope: "world",         // Shared by all users in the world
    config: true,           // Visible in the settings UI
    type: String,
    default: ""
  });
});
