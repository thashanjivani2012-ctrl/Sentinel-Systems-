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
  new SlashCommandBuilder().setName("ping").setDescription("Check whether Sentinel is online"),
  new SlashCommandBuilder().setName("help").setDescription("Show available commands"),
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

const eightBall = [
  "It is certain.", "Without a doubt.", "Yes, definitely.", "Most likely.", "Signs point to yes.",
  "Ask again later.", "Cannot predict now.", "Don't count on it.", "My sources say no.", "Very doubtful.",
]

const formatDuration = (ms) => {
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  return [d && `${d}d`, (d || h) && `${h}h`, `${m}m`, `${s % 60}s`].filter(Boolean).join(" ")
}

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
      body: commands.map((c) => c.toJSON()),
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

  const embed = new EmbedBuilder().setColor(0x5865f2)

  if (interaction.commandName === "uptime") {
    embed.setTitle("Uptime").setDescription(formatDuration(client.uptime ?? 0))
    await interaction.reply({ embeds: [embed] })
  }

  if (interaction.commandName === "serverinfo") {
    const g = interaction.guild
    embed
      .setTitle(g.name)
      .setThumbnail(g.iconURL())
      .addFields(
        { name: "Members", value: String(g.memberCount), inline: true },
        { name: "Created", value: `<t:${Math.floor(g.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "Owner", value: `<@${g.ownerId}>`, inline: true },
      )
    await interaction.reply({ embeds: [embed] })
  }

  if (interaction.commandName === "userinfo") {
    const user = interaction.options.getUser("user") ?? interaction.user
    embed
      .setTitle(user.tag)
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: "ID", value: user.id, inline: true },
        { name: "Account created", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:D>`, inline: true },
        { name: "Bot", value: user.bot ? "Yes" : "No", inline: true },
      )
    await interaction.reply({ embeds: [embed] })
  }

  if (interaction.commandName === "avatar") {
    const user = interaction.options.getUser("user") ?? interaction.user
    embed.setTitle(`${user.username}'s avatar`).setImage(user.displayAvatarURL({ size: 1024 }))
    await interaction.reply({ embeds: [embed] })
  }

  if (interaction.commandName === "roll") {
    const sides = interaction.options.getInteger("sides") ?? 6
    embed.setTitle("Dice roll").setDescription(`You rolled a **${1 + Math.floor(Math.random() * sides)}** (d${sides})`)
    await interaction.reply({ embeds: [embed] })
  }

  if (interaction.commandName === "coinflip") {
    embed.setTitle("Coin flip").setDescription(`**${Math.random() < 0.5 ? "Heads" : "Tails"}**`)
    await interaction.reply({ embeds: [embed] })
  }

  if (interaction.commandName === "8ball") {
    const q = interaction.options.getString("question", true)
    embed
      .setTitle("Magic 8-ball")
      .addFields(
        { name: "Question", value: q },
        { name: "Answer", value: eightBall[Math.floor(Math.random() * eightBall.length)] },
      )
    await interaction.reply({ embeds: [embed] })
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
