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
- `bot/cards.py` — the `/status` Components V2 card.
- `bot/content.py` — wording for `/rules` and `/info`.
- `bot/cogs/` — one file per command group. New files load automatically.

## Deployment

Railway builds the root `Dockerfile` and runs `python -m bot.main`, so the
Node app and the bot no longer share a runtime. The bot serves `/health`
(200 when connected, 503 while starting) on `PORT`, falling back to
`DISCORD_HEALTH_PORT` and then `8787`.

Set `DISCORD_BOT_TOKEN` and `DISCORD_APPLICATION_ID` in the Railway service.
`DISCORD_GUILD_ID` is optional and registers commands to that server instantly.

Enable **Server Members Intent** in the Discord Developer Portal; the bot
needs it for join, leave and role-change events. If you deploy before the
toggle is on, set `DISCORD_MEMBERS_INTENT=false` to start without them.

## Portal events

The bot posts signed events to `PORTAL_EVENTS_URL` (default
`https://sentinelsys.xyz/api/public/discord/events`).

| Variable | Purpose |
| :--- | :--- |
| `PORTAL_EVENTS_URL` | Delivery endpoint |
| `BOT_EVENTS_SECRET` | Shared HMAC secret; delivery is disabled without it |
| `PRIMARY_GUILD_ID` | Guild whose events are sent (defaults to `GUILD_ID`) |

Each request sends `Content-Type: application/json`,
`X-FSRP-Timestamp` (UTC epoch seconds) and `X-FSRP-Signature`
(`HMAC-SHA256(secret, "<timestamp>.<raw body>")`, lowercase hex).

Events emitted:

- `member_joined` — user, account age, join time, member count
- `member_left` — user, join time, leave time
- `member_roles_updated` — added/removed/current roles
- `dm_received` — message content and attachment metadata
- `ticket_closed` — when a `ticket-*` channel is deleted

Delivery is queued in the background. `400`/`401` responses are logged and
dropped; `429`, `5xx` and network errors retry with exponential backoff, up
to 5 attempts, reusing the same `event_id`. Payloads over 64 KB are dropped
with a warning. DMs are truncated at 4000 characters and 10 attachments.

