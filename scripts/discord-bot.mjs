import { createServer } from "node:http"
import {
  Client,
  ContainerBuilder,
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

import { info, rules } from "./content.mjs"
import { COLORS, buildEmbed, contentEmbed, field } from "./embeds.mjs"

const token = process.env.DISCORD_BOT_TOKEN
  ?.trim()
  .replace(/^Bot\s+/i, "")
  .replace(/^['"]|['"]$/g, "")
const guildId = process.env.DISCORD_GUILD_ID?.trim()

if (!token) throw new Error("Missing DISCORD_BOT_TOKEN")

// Single source of truth: /help and command registration both read this list.
const commands = [
  new SlashCommandBuilder().setName("ping").setDescription("Check whether Sentinel is online"),
  new SlashCommandBuilder().setName("status").setDescription("Show detailed system status"),
  new SlashCommandBuilder().setName("help").setDescription("Show available commands"),
  new SlashCommandBuilder().setName("rules").setDescription("Show the server rules"),
  new SlashCommandBuilder().setName("info").setDescription("Show information about Sentinel"),
  new SlashCommandBuilder().setName("uptime").setDescription("Show how long the bot has been running"),
  new SlashCommandBuilder().setName("serverinfo").setDescription("Show info about this server").setDMPermission(false),
  new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Show info about a user")
    .addUserOption((o) => o.setName("user").setDescription("User to look up (defaults to you)")),
  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Show a user's avatar")
    .addUserOption((o) => o.setName("user").setDescription("User (defaults to you)")),
  new SlashCommandBuilder()
    .setName("roll")
    .setDescription("Roll a die")
    .addIntegerOption((o) => o.setName("sides").setDescription("Number of sides (default 6)").setMinValue(2).setMaxValue(1000)),
  new SlashCommandBuilder().setName("coinflip").setDescription("Flip a coin"),
  new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Ask the magic 8-ball")
    .addStringOption((o) => o.setName("question").setDescription("Your question").setRequired(true).setMaxLength(200)),
]

// Discord rejects a payload with two commands of the same name, so register each name once.
function dedupeCommands(list) {
  const byName = new Map()
  for (const command of list) byName.set(command.name, command)
  return [...byName.values()]
}

const commandList = dedupeCommands(commands)

const eightBall = [
  "It is certain.", "Without a doubt.", "Yes, definitely.", "Most likely.", "Signs point to yes.",
  "Ask again later.", "Cannot predict now.", "Don't count on it.", "My sources say no.", "Very doubtful.",
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
    commands: commandList.length,
    memory: `${heapUsed.toFixed(1)} MB`,
    node: process.version,
  }
}

function buildStatusContainer(responseTime) {
  const status = getStatusSnapshot()
  const color = status.online ? COLORS.success : COLORS.warning
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
        `**Commands** — ${status.commands}`,
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
    const body = commandList.map((command) => command.toJSON())
    const globalRoute = Routes.applicationCommands(applicationId)

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body })
      // Wipe stale global registrations so commands don't appear twice.
      await rest.put(globalRoute, { body: [] })
      console.log(`[discord] Registered ${body.length} commands in guild ${guildId}; cleared global commands`)
    } else {
      await rest.put(globalRoute, { body })
      // Wipe guild-scoped copies left behind by an earlier DISCORD_GUILD_ID run.
      for (const guild of readyClient.guilds.cache.values()) {
        await rest.put(Routes.applicationGuildCommands(applicationId, guild.id), { body: [] })
      }
      console.log(`[discord] Registered ${body.length} commands globally; cleared guild-scoped copies`)
    }
  } catch (error) {
    console.error("[discord] Command registration failed; keeping the bot online.", error)
  }
})

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return

  try {
    if (interaction.commandName === "ping") {
      await interaction.reply({
        embeds: [
          buildEmbed({
            color: "success",
            title: "Pong!",
            description: "Sentinel is online and ready.",
            fields: [
              field("Gateway latency", formatLatency(client.ws.ping)),
              field("Response time", `${Date.now() - interaction.createdTimestamp} ms`),
            ],
          }),
        ],
      })
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
      await interaction.reply({
        embeds: [
          buildEmbed({
            color: "info",
            title: "Sentinel commands",
            description: commandList.map((command) => `\`/${command.name}\` — ${command.description}`).join("\n"),
          }),
        ],
        flags: MessageFlags.Ephemeral,
      })
      return
    }

    if (interaction.commandName === "rules") {
      await interaction.reply({
        embeds: [contentEmbed(rules, { thumbnailURL: client.user.displayAvatarURL() })],
      })
      return
    }

    if (interaction.commandName === "info") {
      const status = getStatusSnapshot()
      await interaction.reply({
        embeds: [
          contentEmbed(info, {
            color: "info",
            thumbnailURL: client.user.displayAvatarURL(),
            fields: [
              ...info.fields,
              field("Commands", String(status.commands)),
              field("Guilds", String(status.guilds)),
              field("Uptime", formatDuration(status.uptime)),
              field("Latency", formatLatency(status.gatewayLatency)),
            ],
          }),
        ],
      })
      return
    }

    if (interaction.commandName === "uptime") {
      await interaction.reply({
        embeds: [
          buildEmbed({
            title: "Uptime",
            description: `Sentinel has been online for **${formatDuration(client.uptime ?? 0)}**.`,
          }),
        ],
      })
      return
    }

    if (interaction.commandName === "serverinfo") {
      const guild = interaction.guild
      if (!guild) {
        await interaction.reply({
          embeds: [buildEmbed({ color: "warning", description: "This command only works in a server." })],
          flags: MessageFlags.Ephemeral,
        })
        return
      }
      await interaction.reply({
        embeds: [
          buildEmbed({
            title: guild.name,
            thumbnailURL: guild.iconURL(),
            fields: [
              field("Members", String(guild.memberCount)),
              field("Created", `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`),
              field("Owner", `<@${guild.ownerId}>`),
            ],
          }),
        ],
      })
      return
    }

    if (interaction.commandName === "userinfo") {
      const user = interaction.options.getUser("user") ?? interaction.user
      await interaction.reply({
        embeds: [
          buildEmbed({
            title: user.tag,
            thumbnailURL: user.displayAvatarURL(),
            fields: [
              field("ID", user.id),
              field("Account created", `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`),
              field("Bot", user.bot ? "Yes" : "No"),
            ],
          }),
        ],
      })
      return
    }

    if (interaction.commandName === "avatar") {
      const user = interaction.options.getUser("user") ?? interaction.user
      await interaction.reply({
        embeds: [
          buildEmbed({
            title: `${user.username}'s avatar`,
            imageURL: user.displayAvatarURL({ size: 1024 }),
          }),
        ],
      })
      return
    }

    if (interaction.commandName === "roll") {
      const sides = interaction.options.getInteger("sides") ?? 6
      await interaction.reply({
        embeds: [
          buildEmbed({
            title: "Dice roll",
            description: `You rolled a **${1 + Math.floor(Math.random() * sides)}** (d${sides})`,
          }),
        ],
      })
      return
    }

    if (interaction.commandName === "coinflip") {
      await interaction.reply({
        embeds: [
          buildEmbed({
            title: "Coin flip",
            description: `**${Math.random() < 0.5 ? "Heads" : "Tails"}**`,
          }),
        ],
      })
      return
    }

    if (interaction.commandName === "8ball") {
      const question = interaction.options.getString("question", true)
      await interaction.reply({
        embeds: [
          buildEmbed({
            title: "Magic 8-ball",
            fields: [
              field("Question", question, false),
              field("Answer", eightBall[Math.floor(Math.random() * eightBall.length)], false),
            ],
          }),
        ],
      })
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
