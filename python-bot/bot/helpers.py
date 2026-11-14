from __future__ import annotations

import math
import platform
import sys
import time
from typing import Any

import discord
from discord import app_commands
from discord.ext import commands

from bot import config


def format_duration(ms: float | None) -> str:
    total = max(0, int((ms or 0) // 1000))
    days, remainder = divmod(total, 86_400)
    hours, remainder = divmod(remainder, 3_600)
    minutes, seconds = divmod(remainder, 60)
    parts = (
        f"{days}d" if days else "",
        f"{hours}h" if hours else "",
        f"{minutes}m" if minutes else "",
        f"{seconds}s" if seconds else "",
    )
    return " ".join(part for part in parts if part) or "0s"


def format_latency(ms: float | None) -> str:
    # discord.py reports nan until the first heartbeat round-trip completes.
    if ms is None or not math.isfinite(ms) or ms < 0:
        return "measuring"
    return f"{round(ms)} ms"


def memory_usage() -> str | None:
    # The resource module is unavailable on Windows; the caller shows a fallback.
    try:
        import resource
    except ImportError:
        return None
    usage = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    kilobytes = usage if sys.platform != "darwin" else usage / 1024
    return f"{kilobytes / 1024:.1f} MB"


def uptime_ms(bot: commands.Bot) -> float:
    launched_at = getattr(bot, "launched_at", None)
    if launched_at is None:
        return 0.0
    return max(0.0, (time.monotonic() - launched_at) * 1000)


def response_time_ms(interaction: discord.Interaction) -> int:
    created_at = getattr(interaction, "created_at", None)
    if created_at is None:
        return 0
    return max(0, round((discord.utils.utcnow() - created_at).total_seconds() * 1000))


def command_list(bot: commands.Bot) -> list[app_commands.Command]:
    # Global commands are cleared when GUILD_ID is set, so read the guild copy.
    if config.GUILD_ID:
        guild = discord.Object(id=config.GUILD_ID)
        commands = bot.tree.get_commands(guild=guild)
        if commands:
            return commands
    return bot.tree.get_commands()


def user_label(user: discord.abc.User) -> str:
    discriminator = getattr(user, "discriminator", "0")
    return user.name if discriminator in ("", "0") else f"{user.name}#{discriminator}"


def status_snapshot(bot: commands.Bot) -> dict[str, Any]:
    return {
        "online": bot.is_ready(),
        "uptime": uptime_ms(bot),
        "gateway_latency": bot.latency * 1000,
        "guilds": len(bot.guilds),
        "commands": len(command_list(bot)),
        "memory": memory_usage() or "unavailable",
        "python": platform.python_version(),
    }
