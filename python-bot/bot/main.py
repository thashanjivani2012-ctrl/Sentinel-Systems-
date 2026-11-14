import logging
import pathlib

import discord
from discord.ext import commands

from bot import config

logging.basicConfig(level=logging.INFO)


class Bot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        # intents.message_content = True  # also enable in the Developer Portal
        super().__init__(command_prefix="!", intents=intents,
                         application_id=config.APPLICATION_ID)

    async def setup_hook(self):
        for f in sorted(pathlib.Path(__file__).parent.joinpath("cogs").glob("[!_]*.py")):
            await self.load_extension(f"bot.cogs.{f.stem}")
        if config.GUILD_ID:
            guild = discord.Object(id=config.GUILD_ID)
            self.tree.clear_commands(guild=None)
            await self.tree.sync()
            self.tree.copy_global_to(guild=guild)
            await self.tree.sync(guild=guild)
        else:
            await self.tree.sync()

    async def on_ready(self):
        logging.info("Logged in as %s (%s)", self.user, self.user.id)


def main():
    if not config.TOKEN:
        raise SystemExit("DISCORD_TOKEN is not set. Add it to .env")
    Bot().run(config.TOKEN)


if __name__ == "__main__":
    main()
