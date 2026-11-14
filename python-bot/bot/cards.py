import discord
from discord import ui

from bot import helpers
from bot.embeds import COLORS


def status_card(bot, response_time_ms: int) -> ui.LayoutView:
    """The live status card, built with Components V2."""
    status = helpers.status_snapshot(bot)
    online = status["online"]
    accent = COLORS["success"] if online else COLORS["warning"]
    state = "Online" if online else "Connecting"
    heading = (
        "Online — gateway connected and responding"
        if online
        else "Connecting — gateway is reconnecting"
    )

    container = ui.Container(accent_colour=accent)
    container.add_item(ui.TextDisplay(f"## Sentinel Systems\n**● {state}** — {heading}"))
    container.add_item(ui.Separator())

    container.add_item(
        ui.Section(
            ui.TextDisplay(
                "\n".join(
                    (
                        f"**Uptime** — {helpers.format_duration(status['uptime'])}",
                        f"**Gateway latency** — {helpers.format_latency(status['gateway_latency'])}",
                        f"**Response time** — {response_time_ms} ms",
                    )
                )
            ),
            accessory=ui.Thumbnail(bot.user.display_avatar.url),
        )
    )

    container.add_item(ui.Separator())
    container.add_item(
        ui.TextDisplay(
            "\n".join(
                (
                    f"**Guilds** — {status['guilds']}",
                    f"**Commands** — {status['commands']}",
                    f"**Memory** — {status['memory']}",
                    f"**Python** — {status['python']}",
                )
            )
        )
    )

    container.add_item(ui.Separator())
    container.add_item(
        ui.TextDisplay(
            f"-# {helpers.user_label(bot.user)} · "
            f"{'all systems operational' if online else 'reconnecting'}"
        )
    )

    view = ui.LayoutView(timeout=None)
    view.add_item(container)
    return view
