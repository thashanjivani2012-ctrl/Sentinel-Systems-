# Python Discord bot

discord.py bot with a shared embed builder. Separate from the Node bot that
Railway runs from the repo root.

    cp .env.example .env   # fill in DISCORD_TOKEN, APPLICATION_ID, optional GUILD_ID
    uv sync
    uv run python -m bot.main

Without `uv`:

    python -m venv .venv
    .venv\Scripts\activate
    pip install "discord.py>=2.4" "python-dotenv>=1.0"
    python -m bot.main

`DISCORD_BOT_TOKEN`, `DISCORD_APPLICATION_ID` and `DISCORD_GUILD_ID` are also
accepted, so the root `.env` works unchanged.

## Commands

`/ping` · `/status` · `/help` · `/rules` · `/info` · `/uptime` ·
`/serverinfo` · `/userinfo [user]` · `/avatar [user]` · `/roll [sides]` ·
`/coinflip` · `/8ball <question>`

## Customising

- `bot/embeds.py` — the embed builder and global theme.
  `configure_theme(color=..., footer=..., thumbnail_url=..., timestamp=False)`
  restyles every embed in one place.
- `bot/content.py` — wording for `/rules` and `/info`.
- `bot/cogs/` — one file per command group. New files load automatically.
