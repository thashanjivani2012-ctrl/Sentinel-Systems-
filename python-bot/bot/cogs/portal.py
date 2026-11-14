import logging
import time
from datetime import datetime, timezone

import discord
from discord.ext import commands

from bot import config


def _iso(value: datetime | None) -> str | None:
    return value.astimezone(timezone.utc).isoformat() if value else None


def _user_data(user: discord.abc.User) -> dict:
    return {
        "user_id": str(user.id),
        "username": user.name,
        "display_name": getattr(user, "display_name", user.name),
        "avatar_url": user.display_avatar.url,
        "bot": user.bot,
    }


def _role_refs(roles) -> list[dict]:
    return [{"id": str(role.id), "name": role.name} for role in roles]


class Portal(commands.Cog):
    """Forwards Discord activity to the Sentinel portal."""

    def __init__(self, bot: commands.Bot):
        self.bot = bot
        self._warned_no_guild = False

    def _allowed(self, guild: discord.Guild) -> bool:
        return config.PRIMARY_GUILD_ID is None or guild.id == config.PRIMARY_GUILD_ID

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        if not self._allowed(member.guild):
            return
        self.bot.portal.emit(
            "member_joined",
            member.guild.id,
            {
                **_user_data(member),
                "joined_at": _iso(member.joined_at),
                "account_created_at": _iso(member.created_at),
                "member_count": member.guild.member_count,
            },
            event_id=f"member_joined:{member.guild.id}:{member.id}:{int(time.time())}",
        )

    @commands.Cog.listener()
    async def on_member_remove(self, member: discord.Member):
        if not self._allowed(member.guild):
            return
        self.bot.portal.emit(
            "member_left",
            member.guild.id,
            {
                **_user_data(member),
                "joined_at": _iso(member.joined_at),
                "left_at": _iso(datetime.now(timezone.utc)),
            },
            event_id=f"member_left:{member.guild.id}:{member.id}:{int(time.time())}",
        )

    @commands.Cog.listener()
    async def on_member_update(
        self, before: discord.Member, after: discord.Member
    ):
        if not self._allowed(after.guild):
            return
        before_ids = {role.id for role in before.roles}
        after_ids = {role.id for role in after.roles}
        added = [role for role in after.roles if role.id not in before_ids]
        removed = [role for role in before.roles if role.id not in after_ids]
        if not added and not removed:
            return
        self.bot.portal.emit(
            "member_roles_updated",
            after.guild.id,
            {
                **_user_data(after),
                "added_roles": _role_refs(added),
                "removed_roles": _role_refs(removed),
                "roles": _role_refs(after.roles),
            },
            event_id=(
                f"member_roles_updated:{after.guild.id}:{after.id}:"
                f"{int(time.time() * 1000)}"
            ),
        )

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        if message.guild is not None or message.author.bot:
            return
        guild_id = config.PRIMARY_GUILD_ID
        if guild_id is None:
            mutual = next(iter(message.author.mutual_guilds), None)
            guild_id = mutual.id if mutual else None
        if guild_id is None:
            if not self._warned_no_guild:
                self._warned_no_guild = True
                logging.warning(
                    "Skipping DM events: set PRIMARY_GUILD_ID so they have a guild"
                )
            return

        self.bot.portal.emit(
            "dm_received",
            guild_id,
            {
                **_user_data(message.author),
                "message_id": str(message.id),
                "content": message.content[:4000],
                "created_at": _iso(message.created_at),
                "attachments": [
                    {
                        "id": str(attachment.id),
                        "filename": attachment.filename,
                        "url": attachment.url,
                        "content_type": attachment.content_type,
                        "size": attachment.size,
                    }
                    for attachment in message.attachments[:10]
                ],
            },
            event_id=f"dm:{message.id}",
        )

    @commands.Cog.listener()
    async def on_guild_channel_delete(self, channel: discord.abc.GuildChannel):
        if not isinstance(channel, discord.TextChannel):
            return
        if not self._allowed(channel.guild):
            return
        if not channel.name.lower().startswith("ticket-"):
            return
        self.bot.portal.emit(
            "ticket_closed",
            channel.guild.id,
            {
                "channel_id": str(channel.id),
                "channel_name": channel.name,
                "ticket_id": channel.name[len("ticket-"):],
                "closed_at": _iso(datetime.now(timezone.utc)),
            },
            event_id=f"ticket_closed:{channel.id}",
        )


async def setup(bot: commands.Bot):
    await bot.add_cog(Portal(bot))
