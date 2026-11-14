import os
from dotenv import load_dotenv

load_dotenv()


def _env(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


def _int_env(*names: str) -> int | None:
    value = _env(*names)
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        raise SystemExit(f"{names[0]} must be a numeric ID, got {value!r}") from None


# Accept both the python-bot names and the root .env names.
TOKEN = _env("DISCORD_TOKEN", "DISCORD_BOT_TOKEN")
APPLICATION_ID = _int_env("APPLICATION_ID", "DISCORD_APPLICATION_ID")
GUILD_ID = _int_env("GUILD_ID", "DISCORD_GUILD_ID")
HEALTH_PORT = _int_env("PORT", "DISCORD_HEALTH_PORT") or 8787
