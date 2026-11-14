import { createServer } from "node:http"
import {
  Client,
  ContainerBuilder,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  SlashCommandBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js"

const token = process.env.DISCORD_BOT_TOKEN
  ?.trim()
  .replace(/^Bot\s+/i, "")
  .replace(/^['"]|['"]$/g, "")
const guildId = process.env.DISCORD_GUILD_ID?.trim()

if (!token) throw new Error("Missing DISCORD_BOT_TOKEN")

// Single source of truth: /help and command registration both read this list.
const commands = [
  { name: "ping", description: "Check whether Sentinel is online" },
  { name: "status", description: "Show detailed system status" },
  { name: "help", description: "Show available commands" },
]

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
let discordReady = false

function formatDuration(ms) {
  const total = Math.floor(ms / 1000)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", minutes ? `${minutes}m` : "", seconds ? `${seconds}s` : ""]
    .filter(Boolean)
    .join(" ") || "0s"
}

// ws.ping stays at -1 until the first heartbeat round-trip completes.
function formatLatency(ms) {
  return ms >= 0 ? `${Math.round(ms)} ms` : "measuring"
}

// Status system: a single source of truth for the live status snapshot.
function getStatusSnapshot() {
  const uptime = client.readyAt ? Date.now() - client.readyAt.getTime() : 0
  const heapUsed = process.memoryUsage().heapUsed / 1024 / 1024
  return {
    online: discordReady,
    uptime,
    gatewayLatency: client.ws.ping,
    guilds: client.guilds.cache.size,
    memory: `${heapUsed.toFixed(1)} MB`,
    node: process.version,
  }
}

function buildStatusContainer(responseTime) {
  const status = getStatusSnapshot()
  const color = status.online ? 0x57f287 : 0xfee75c
  const heading = status.online ? "Online — gateway connected and responding" : "Connecting — gateway is reconnecting"

  const container = new ContainerBuilder().setAccentColor(color)

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`## Sentinel Systems\n**● ${status.online ? "Online" : "Connecting"}** — ${heading}`),
  )

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))

  container.addSectionComponents(
    new SectionBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `**Uptime** — ${formatDuration(status.uptime)}`,
            `**Gateway latency** — ${formatLatency(status.gatewayLatency)}`,
            `**Response time** — ${responseTime} ms`,
          ].join("\n"),
        ),
      )
      .setThumbnailAccessory(new ThumbnailBuilder().setURL(client.user.displayAvatarURL())),
  )

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      [
        `**Guilds** — ${status.guilds}`,
        `**Commands** — ${commands.length}`,
        `**Memory** — ${status.memory}`,
        `**Node.js** — ${status.node}`,
      ].join("\n"),
    ),
  )

  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${client.user.tag} · ${status.online ? "all systems operational" : "reconnecting"}`),
  )

  return container
}

client.once(Events.ClientReady, async (readyClient) => {
  discordReady = true
  console.log(`[discord] Logged in as ${readyClient.user.tag}`)
  try {
    const applicationId = process.env.DISCORD_APPLICATION_ID
    if (!applicationId) throw new Error("Missing DISCORD_APPLICATION_ID")

    const rest = new REST({ version: "10" }).setToken(token)
    const body = commands.map((c) => new SlashCommandBuilder().setName(c.name).setDescription(c.description).toJSON())
    const globalRoute = Routes.applicationCommands(applicationId)

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body })
      // Wipe stale global registrations so commands don't appear twice.
      await rest.put(globalRoute, { body: [] })
      console.log(`[discord] Registered commands in guild ${guildId}; cleared global commands`)
    } else {
      await rest.put(globalRoute, { body })
      console.log("[discord] Registered commands globally")
    }
  } catch (error) {
    console.error("[discord] Command registration failed; keeping the bot online.", error)
  }
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  try {
    if (interaction.commandName === "ping") {
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("Pong!")
        .setDescription("Sentinel is online and ready.")
        .addFields(
          { name: "Gateway latency", value: formatLatency(client.ws.ping), inline: true },
          { name: "Response time", value: `${Date.now() - interaction.createdTimestamp} ms`, inline: true },
        )
        .setTimestamp()
      await interaction.reply({ embeds: [embed] })
      return
    }

    if (interaction.commandName === "status") {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [buildStatusContainer(Date.now() - interaction.createdTimestamp)],
      })
      return
    }

    if (interaction.commandName === "help") {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("Sentinel commands")
        .setDescription(commands.map((c) => `\`/${c.name}\` — ${c.description}`).join("\n"))
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral })
      return
    }
  } catch (error) {
    console.error(`[discord] /${interaction.commandName} failed:`, error)

    const payload = { content: "That command failed. Try again in a moment.", flags: MessageFlags.Ephemeral }
    const respond = interaction.deferred || interaction.replied
      ? () => interaction.followUp(payload)
      : () => interaction.reply(payload)
    await respond().catch(() => {})
  }
})

client.on(Events.ShardDisconnect, () => {
  discordReady = false
  console.warn("[discord] Gateway disconnected; waiting for automatic reconnect.")
})

client.on(Events.ShardResume, () => {
  discordReady = true
  console.log("[discord] Gateway resumed.")
})

client.on(Events.Error, (error) => {
  console.error("[discord] Gateway error:", error)
})

const healthPort = Number(process.env.PORT || process.env.DISCORD_HEALTH_PORT || 8787)
const healthServer = createServer((request, response) => {
  const isHealthCheck = request.url === "/health" || request.url === "/"
  if (!isHealthCheck) {
    response.writeHead(404)
    response.end("not found")
    return
  }

  response.writeHead(discordReady ? 200 : 503, { "content-type": "application/json" })
  response.end(JSON.stringify({ status: discordReady ? "online" : "starting", service: "discord-bot" }))
})

// Keep the bot online even if the port is taken; the health check is secondary.
healthServer.on("error", (error) => {
  console.error(`[discord] Health server unavailable on port ${healthPort}:`, error)
})

healthServer.listen(healthPort, "0.0.0.0")

async function shutdown() {
  healthServer.close()
  client.destroy()
  process.exit(0)
}

process.once("SIGINT", shutdown)
process.once("SIGTERM", shutdown)

await client.login(token)
