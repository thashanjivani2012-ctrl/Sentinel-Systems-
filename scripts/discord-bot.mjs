import { createServer } from "node:http"
import { Client, Events, GatewayIntentBits, REST, Routes, SlashCommandBuilder } from "discord.js"

const token = process.env.DISCORD_BOT_TOKEN
const guildId = process.env.DISCORD_GUILD_ID

if (!token) throw new Error("Missing DISCORD_BOT_TOKEN")

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`[discord] Logged in as ${readyClient.user.tag}`)
  if (!guildId) return

  const rest = new REST({ version: "10" }).setToken(token)
  await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_APPLICATION_ID, guildId), {
    body: [
      new SlashCommandBuilder().setName("ping").setDescription("Check whether Sentinel is online").toJSON(),
      new SlashCommandBuilder().setName("help").setDescription("Show available commands").toJSON(),
    ],
  })
  console.log(`[discord] Registered commands in guild ${guildId}`)
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

process.once("SIGINT", () => client.destroy())
process.once("SIGTERM", () => client.destroy())

const healthPort = Number(process.env.DISCORD_HEALTH_PORT ?? 8787)
createServer((_, response) => {
  response.writeHead(200, { "content-type": "text/plain" })
  response.end("discord bot online")
}).listen(healthPort, "0.0.0.0")

await client.login(token)
