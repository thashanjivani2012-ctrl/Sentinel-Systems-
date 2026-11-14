import discord
from discord import app_commands
from discord.ext import commands

from bot import helpers
from bot.embeds import DIVIDER, build_embed, field


class Users(commands.Cog):
    def __init__(self, bot: commands.Bot):
        self.bot = bot

    @app_commands.command(name="userinfo", description="Show info about a user")
    @app_commands.describe(user="User to look up (defaults to you)")
    async def userinfo(
        self, interaction: discord.Interaction, user: discord.User | None = None
    ):
        target = user or interaction.user
        fields = [
            field("**ID**", f"> {target.id}", False),
            field("**Account Created**", f"> <t:{int(target.created_at.timestamp())}:D>", False),
        ]
        member = interaction.guild.get_member(target.id) if interaction.guild else None
        if member is not None and member.joined_at is not None:
            fields.append(field("**Joined**", f"> <t:{int(member.joined_at.timestamp())}:D>", False))
        fields.append(field("**Bot**", "> Yes" if target.bot else "> No", False))

        await interaction.response.send_message(
            embed=build_embed(
                title=helpers.user_label(target),
                thumbnail_url=target.display_avatar.url,
                description=f"{DIVIDER}\nUser information\n{DIVIDER}",
                fields=fields,
            )
        )

    @app_commands.command(name="avatar", description="Show a user's avatar")
    @app_commands.describe(user="User (defaults to you)")
    async def avatar(
        self, interaction: discord.Interaction, user: discord.User | None = None
    ):
        target = user or interaction.user
        await interaction.response.send_message(
            embed=build_embed(
                title=f"{target.name}'s avatar",
                image_url=target.display_avatar.replace(size=1024).url,
            )
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Users(bot))
