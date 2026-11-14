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

## Deployment

Railway builds the root `Dockerfile` and runs `python -m bot.main`, so the
Node app and the bot no longer share a runtime. The bot serves `/health`
(200 when connected, 503 while starting) on `PORT`, falling back to
`DISCORD_HEALTH_PORT` and then `8787`.

Set `DISCORD_BOT_TOKEN` and `DISCORD_APPLICATION_ID` in the Railway service.
`DISCORD_GUILD_ID` is optional and registers commands to that server instantly.

