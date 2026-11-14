import discord
from discord import app_commands
from discord.ext import commands

from bot import content, helpers
from bot.cards import status_card
from bot.embeds import DIVIDER, build_embed, content_embed, field


class General(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @property
    def avatar_url(self) -> str | None:
        return self.bot.user.display_avatar.url if self.bot.user else None

    @app_commands.command(name="ping", description="Check whether Sentinel is online")
    async def ping(self, interaction: discord.Interaction):
        status = helpers.status_snapshot(self.bot)
        await interaction.response.send_message(
            embed=build_embed(
                color="success",
                title="Pong!",
                description=f"{DIVIDER}\nSentinel is online and ready.\n{DIVIDER}",
                fields=[
                    field("**Gateway Latency**", f"> {helpers.format_latency(status['gateway_latency'])}", False),
                    field("**Response Time**", f"> {helpers.response_time_ms(interaction)} ms", False),
                ],
            )
        )

    @app_commands.command(name="status", description="Show detailed system status")
    async def status(self, interaction: discord.Interaction):
        await interaction.response.send_message(
            view=status_card(self.bot, helpers.response_time_ms(interaction))
        )

    @app_commands.command(name="help", description="Show available commands")
    async def help(self, interaction: discord.Interaction):
        lines = [
            f"`/{command.name}` — {command.description}"
            for command in helpers.command_list(self.bot)
        ]
        await interaction.response.send_message(
            embed=build_embed(
                color="info",
                title="Sentinel Commands",
                description=f"{DIVIDER}\n" + ("\n".join(lines) or "No commands available.") + f"\n{DIVIDER}",
            ),
            ephemeral=True,
        )

    @app_commands.command(name="rules", description="Show the server rules")
    async def rules(self, interaction: discord.Interaction):
        await interaction.response.send_message(
            embed=content_embed(content.RULES, thumbnail_url=self.avatar_url)
        )

    @app_commands.command(name="info", description="Show information about Sentinel")
    async def info(self, interaction: discord.Interaction):
        status = helpers.status_snapshot(self.bot)
        await interaction.response.send_message(
            embed=content_embed(
                content.INFO,
                color="info",
                thumbnail_url=self.avatar_url,
                fields=[
                    *content.INFO["fields"],
                    field("Commands", str(status["commands"])),
                    field("Guilds", str(status["guilds"])),
                    field("Uptime", helpers.format_duration(status["uptime"])),
                    field("Latency", helpers.format_latency(status["gateway_latency"])),
                ],
            )
        )

    @app_commands.command(name="uptime", description="Show how long the bot has been running")
    async def uptime(self, interaction: discord.Interaction):
        duration = helpers.format_duration(helpers.uptime_ms(self.bot))
        await interaction.response.send_message(
            embed=build_embed(
                title="Uptime",
                description=f"{DIVIDER}\nSentinel has been online for **{duration}**.\n{DIVIDER}",
            )
        )

    @app_commands.command(name="serverinfo", description="Show info about this server")
    @app_commands.guild_only()
    async def serverinfo(self, interaction: discord.Interaction):
        guild = interaction.guild
        await interaction.response.send_message(
            embed=build_embed(
                title=guild.name,
                thumbnail_url=guild.icon.url if guild.icon else None,
                description=f"{DIVIDER}\nServer information and statistics\n{DIVIDER}",
                fields=[
                    field("**Members**", f"> {guild.member_count}", False),
                    field("**Created**", f"> <t:{int(guild.created_at.timestamp())}:D>", False),
                    field("**Owner**", f"> <@{guild.owner_id}>", False),
                ],
            )
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(General(bot))
