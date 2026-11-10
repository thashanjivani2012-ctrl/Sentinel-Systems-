import { createServer } from "node:http"
import { Client, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js"

const token = process.env.DISCORD_BOT_TOKEN
  ?.trim()
  .replace(/^Bot\s+/i, "")
  .replace(/^['"]|['"]$/g, "")
const guildId = process.env.DISCORD_GUILD_ID?.trim()

if (!token) throw new Error("Missing DISCORD_BOT_TOKEN")

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
let discordReady = false

client.once(Events.ClientReady, async (readyClient) => {
  discordReady = true
  console.log(`[discord] Logged in as ${readyClient.user.tag}`)
  if (!guildId) return

  try {
    const applicationId = process.env.DISCORD_APPLICATION_ID
    if (!applicationId) throw new Error("Missing DISCORD_APPLICATION_ID")

    const rest = new REST({ version: "10" }).setToken(token)
    await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
      body: [
        new SlashCommandBuilder().setName("ping").setDescription("Check whether Sentinel is online").toJSON(),
        new SlashCommandBuilder().setName("help").setDescription("Show available commands").toJSON(),
      ],
    })
    console.log(`[discord] Registered commands in guild ${guildId}`)
  } catch (error) {
    console.error("[discord] Command registration failed; keeping the bot online.", error)
  }
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  if (interaction.commandName === "ping") {
    await interaction.reply("Pong. Sentinel is online and ready.")
  }

  if (interaction.commandName === "help") {
    await interaction.reply("Available commands: `/ping` — check status · `/help` — show this message")
  }
})

client.on(Events.ShardDisconnect, () => {
  discordReady = false
  console.warn("[discord] Gateway disconnected; waiting for automatic reconnect.")
})

client.on(Events.Error, (error) => {
  console.error("[discord] Gateway error:", error)
})

process.once("SIGINT", () => client.destroy())
process.once("SIGTERM", () => client.destroy())

const healthPort = Number(process.env.DISCORD_HEALTH_PORT ?? 8787)
createServer((request, response) => {
  const isHealthCheck = request.url === "/health" || request.url === "/"
  if (!isHealthCheck) {
    response.writeHead(404)
    response.end("not found")
    return
  }

  response.writeHead(discordReady ? 200 : 503, { "content-type": "application/json" })
  response.end(JSON.stringify({ status: discordReady ? "online" : "starting", service: "discord-bot" }))
}).listen(healthPort, "0.0.0.0")

await client.login(token)
