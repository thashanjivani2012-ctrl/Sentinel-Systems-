import { Chat } from "chat"
import { createDiscordAdapter } from "@chat-adapter/discord"
import { createMemoryState } from "@chat-adapter/state-memory"

export const bot = new Chat({
  userName: process.env.DISCORD_BOT_USERNAME ?? "sentinel",
  adapters: {
    discord: createDiscordAdapter({ botToken: process.env.DISCORD_BOT_TOKEN ?? "preview-placeholder", publicKey: process.env.DISCORD_PUBLIC_KEY ?? "preview-placeholder", applicationId: process.env.DISCORD_APPLICATION_ID ?? "preview-placeholder" }),
  },
  state: createMemoryState(),
})

bot.onNewMessage(/^\/ping$/i, async (thread) => {
  await thread.post("Pong. Sentinel is online and ready.")
})

bot.onNewMention(async (thread) => {
  await thread.subscribe()
  await thread.post("I’m listening. Try `/ping` to check my status.")
})

bot.onSubscribedMessage(async (thread, message) => {
  if (/^help$/i.test(message.text.trim())) {
    await thread.post("Available commands: `/ping` — check status · `help` — show this message")
  }
})
