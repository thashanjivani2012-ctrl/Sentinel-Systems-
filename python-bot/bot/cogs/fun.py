import random

import discord
from discord import app_commands
from discord.ext import commands

from bot.embeds import build_embed, field

EIGHT_BALL = (
    "It is certain.",
    "Without a doubt.",
    "Yes, definitely.",
    "Most likely.",
    "Signs point to yes.",
    "Ask again later.",
    "Cannot predict now.",
    "Don't count on it.",
    "My sources say no.",
    "Very doubtful.",
)


class Fun(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="roll", description="Roll a die")
    @app_commands.describe(sides="Number of sides (default 6)")
    async def roll(
        self,
        interaction: discord.Interaction,
        sides: app_commands.Range[int, 2, 1000] = 6,
    ):
        result = random.randint(1, sides)
        await interaction.response.send_message(
            embed=build_embed(
                title="Dice roll",
                description=f"You rolled a **{result}** (d{sides})",
            )
        )

    @app_commands.command(name="coinflip", description="Flip a coin")
    async def coinflip(self, interaction: discord.Interaction):
        result = random.choice(("Heads", "Tails"))
        await interaction.response.send_message(
            embed=build_embed(title="Coin flip", description=f"**{result}**")
        )

    @app_commands.command(name="8ball", description="Ask the magic 8-ball")
    @app_commands.describe(question="Your question")
    async def eight_ball(
        self,
        interaction: discord.Interaction,
        question: app_commands.Range[str, 1, 200],
    ):
        await interaction.response.send_message(
            embed=build_embed(
                title="Magic 8-ball",
                fields=[
                    field("Question", question, False),
                    field("Answer", random.choice(EIGHT_BALL), False),
                ],
            )
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Fun(bot))
