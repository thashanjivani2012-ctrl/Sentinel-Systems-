import { createServer } from "node:http"
import { Client, EmbedBuilder, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js"

const token = process.env.DISCORD_BOT_TOKEN
  ?.trim()
  .replace(/^Bot\s+/i, "")
  .replace(/^['"]|['"]$/g, "")
const guildId = process.env.DISCORD_GUILD_ID?.trim()

if (!token) throw new Error("Missing DISCORD_BOT_TOKEN")

// Single source of truth: /help and command registration both read this list.
const commands = [
  { name: "ping", description: "Check whether Sentinel is online" },
  { name: "help", description: "Show available commands" },
]

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
let discordReady = false

client.once(Events.ClientReady, async (readyClient) => {
  discordReady = true
  console.log(`[discord] Logged in as ${readyClient.user.tag}`)
  try {
    const applicationId = process.env.DISCORD_APPLICATION_ID
    if (!applicationId) throw new Error("Missing DISCORD_APPLICATION_ID")

    const rest = new REST({ version: "10" }).setToken(token)
    const route = guildId
      ? Routes.applicationGuildCommands(applicationId, guildId)
      : Routes.applicationCommands(applicationId)
    await rest.put(route, {
      body: commands.map((c) => new SlashCommandBuilder().setName(c.name).setDescription(c.description).toJSON()),
    })
    console.log(`[discord] Registered commands ${guildId ? `in guild ${guildId}` : "globally"}`)
  } catch (error) {
    console.error("[discord] Command registration failed; keeping the bot online.", error)
  }
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  if (interaction.commandName === "ping") {
    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Pong!")
      .setDescription("Sentinel is online and ready.")
      .addFields(
        { name: "Gateway latency", value: `${Math.round(client.ws.ping)} ms`, inline: true },
        { name: "Response time", value: `${Date.now() - interaction.createdTimestamp} ms`, inline: true },
      )
      .setTimestamp()
    await interaction.reply({ embeds: [embed] })
  }

  if (interaction.commandName === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("Sentinel commands")
      .setDescription(commands.map((c) => `\`/${c.name}\` — ${c.description}`).join("\n"))
    await interaction.reply({ embeds: [embed], ephemeral: true })
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
