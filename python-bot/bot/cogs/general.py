import discord
from discord import app_commands
from discord.ext import commands

from bot import config


class General(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="ping", description="Check bot latency")
    async def ping(self, interaction: discord.Interaction):
        await interaction.response.send_message(f"Pong! {round(self.bot.latency * 1000)}ms")

    @app_commands.command(name="help", description="List commands")
    async def help(self, interaction: discord.Interaction):
        # Global commands are cleared when GUILD_ID is set, so read the guild copy.
        guild = discord.Object(id=config.GUILD_ID) if config.GUILD_ID else None
        lines = [f"`/{c.name}` - {c.description}" for c in self.bot.tree.get_commands(guild=guild)]
        await interaction.response.send_message("\n".join(lines) or "No commands available.", ephemeral=True)


async def setup(bot: commands.Bot):
    await bot.add_cog(General(bot))
