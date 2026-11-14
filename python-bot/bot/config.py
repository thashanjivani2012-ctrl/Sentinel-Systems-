import os
from dotenv import load_dotenv

load_dotenv()


def _int_env(name: str) -> int | None:
    value = os.getenv(name, "").strip()
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        raise SystemExit(f"{name} must be a numeric ID, got {value!r}") from None


TOKEN = os.getenv("DISCORD_TOKEN", "").strip()
APPLICATION_ID = _int_env("APPLICATION_ID")
GUILD_ID = _int_env("GUILD_ID")
