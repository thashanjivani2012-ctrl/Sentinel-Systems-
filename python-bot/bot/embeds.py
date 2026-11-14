from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable, Mapping

import discord

COLORS = {
    "primary": 0x6757E8,
    "success": 0x57F287,
    "warning": 0xFEE75C,
    "danger": 0xED4245,
    "info": 0x5865F2,
    "neutral": 0x2B2D31,
    "brand": 3073750,  # Sentinel green
}

DIVIDER = "━━━━━━━━━━━━━━━━━━━━━━━━━"

LIMITS = {
    "title": 256,
    "description": 4096,
    "field_name": 256,
    "field_value": 1024,
    "footer": 2048,
    "author_name": 256,
}


@dataclass
class Theme:
    color: str = "brand"
    author: str | None = None
    author_icon_url: str | None = None
    footer: str | None = "Sentinel Systems"
    footer_icon_url: str | None = None
    thumbnail_url: str | None = None
    image_url: str | None = None
    logo_url: str | None = None  # alias for thumbnail_url (logo at top)
    banner_url: str | None = None  # alias for image_url (banner at bottom)
    timestamp: bool = True


theme = Theme()


def configure_theme(**overrides: Any) -> Theme:
    """Change the look of every embed in one place."""
    for key, value in overrides.items():
        if value is not None and hasattr(theme, key):
            setattr(theme, key, value)
    return theme


def field(name: str, value: str, inline: bool = True) -> dict[str, Any]:
    return {"name": name, "value": value, "inline": inline}


def _clip(value: Any, limit: int) -> str:
    text = "" if value is None else str(value)
    return text if len(text) <= limit else text[: limit - 1] + "…"


def _resolve_color(color: str | int | None) -> discord.Color:
    if isinstance(color, int):
        return discord.Color(color)
    key = color or theme.color
    return discord.Color(COLORS.get(key, COLORS["primary"]))


def _normalise_fields(
    fields: Iterable[Any] | None,
) -> list[tuple[str, str, bool]]:
    usable: list[tuple[str, str, bool]] = []
    for item in fields or []:
        if isinstance(item, Mapping):
            name = item.get("name")
            value = item.get("value")
            inline = item.get("inline", True)
        else:
            name, value, *rest = item
            inline = rest[0] if rest else True

        if not name or not value:
            continue

        usable.append(
            (
                _clip(name, LIMITS["field_name"]),
                _clip(value, LIMITS["field_value"]),
                bool(inline),
            )
        )
        if len(usable) == 25:
            break
    return usable


def build_embed(
    *,
    color: str | int | None = None,
    title: str | None = None,
    description: str | None = None,
    fields: Iterable[Any] | None = None,
    author: str | Mapping[str, str] | None = None,
    footer: str | None = None,
    footer_icon_url: str | None = None,
    thumbnail_url: str | None = None,
    image_url: str | None = None,
    url: str | None = None,
    timestamp: bool | None = None,
) -> discord.Embed:
    embed = discord.Embed(colour=_resolve_color(color))

    if title:
        embed.title = _clip(title, LIMITS["title"])
    if description:
        embed.description = _clip(description, LIMITS["description"])
    if url:
        embed.url = url

    author_spec = author if author is not None else theme.author
    if author_spec:
        if isinstance(author_spec, str):
            embed.set_author(
                name=_clip(author_spec, LIMITS["author_name"]),
                icon_url=theme.author_icon_url,
            )
        else:
            embed.set_author(
                name=_clip(author_spec.get("name"), LIMITS["author_name"]),
                icon_url=author_spec.get("icon_url") or theme.author_icon_url,
                url=author_spec.get("url"),
            )

    for name, value, inline in _normalise_fields(fields):
        embed.add_field(name=name, value=value, inline=inline)

    thumbnail = thumbnail_url or theme.logo_url or theme.thumbnail_url
    if thumbnail:
        embed.set_thumbnail(url=thumbnail)

    image = image_url or theme.banner_url or theme.image_url
    if image:
        embed.set_image(url=image)

    footer_text = footer if footer is not None else theme.footer
    if footer_text:
        embed.set_footer(
            text=_clip(footer_text, LIMITS["footer"]),
            icon_url=footer_icon_url or theme.footer_icon_url,
        )

    if timestamp if timestamp is not None else theme.timestamp:
        embed.timestamp = discord.utils.utcnow()

    return embed


def content_embed(definition: Mapping[str, Any], **overrides: Any) -> discord.Embed:
    """Build an embed from one of the definitions in content.py."""
    spec: dict[str, Any] = {
        "title": definition.get("title"),
        "description": definition.get("description"),
        "fields": definition.get("fields"),
    }
    spec.update(overrides)
    return build_embed(**spec)
