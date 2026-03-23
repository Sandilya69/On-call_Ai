export { routeWithClaude } from "./claude.js";
export type { RoutingResult } from "./claude.js";
export { generateSpeech, buildHandoverPrompt, HANDOVER_SYSTEM_PROMPT } from "./whisper.js";
export type { TTSResult } from "./whisper.js";
export {
  initDiscord,
  getDiscordClient,
  disconnectDiscord,
  sendDiscordDM,
  sendDiscordChannelAlert,
  sendHandoverBriefing,
} from "./discord.js";
