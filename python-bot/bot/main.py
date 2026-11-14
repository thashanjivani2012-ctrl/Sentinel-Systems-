import logging
import pathlib
import time

import discord
from discord import app_commands
from discord.ext import commands

from bot import config

logging.basicConfig(level=logging.INFO)


class Bot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        # intents.message_content = True  # also enable in the Developer Portal
        super().__init__(command_prefix="!", intents=intents,
                         application_id=config.APPLICATION_ID)
        self.launched_at = time.monotonic()
        self._cleared_guild_commands = False

    async def setup_hook(self):
        for f in sorted(pathlib.Path(__file__).parent.joinpath("cogs").glob("[!_]*.py")):
            await self.load_extension(f"bot.cogs.{f.stem}")
        if config.GUILD_ID:
            guild = discord.Object(id=config.GUILD_ID)
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
            self.tree.clear_commands(guild=None)
            await self.tree.sync()
        else:
            await self.tree.sync()
        self.tree.on_error = self.on_tree_error

    async def on_tree_error(
        self, interaction: discord.Interaction, error: app_commands.AppCommandError
    ):
        command = getattr(interaction, "command", None)
        logging.error(
            "Command /%s failed", getattr(command, "name", "unknown"), exc_info=error
        )
        message = "That command failed. Try again in a moment."
        try:
            if interaction.response.is_done():
                await interaction.followup.send(message, ephemeral=True)
            else:
                await interaction.response.send_message(message, ephemeral=True)
        except discord.HTTPException:
            pass

    async def on_ready(self):
        logging.info("Logged in as %s (%s)", self.user, self.user.id)
        if config.GUILD_ID or self._cleared_guild_commands:
            return
        # Guild copies left behind by an earlier GUILD_ID run would show twice.
        self._cleared_guild_commands = True
        for guild in self.guilds:
            self.tree.clear_commands(guild=guild)
            try:
                await self.tree.sync(guild=guild)
            except discord.HTTPException:
                logging.warning("Could not clear guild commands for %s", guild.id)


def main():
    if not config.TOKEN:
        raise SystemExit("DISCORD_TOKEN is not set. Add it to .env")
    Bot().run(config.TOKEN)


if __name__ == "__main__":
    main()
