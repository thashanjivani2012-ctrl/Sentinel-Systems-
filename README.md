# Sentinel Systems

Next.js site for Sentinel, plus the Discord bot in `python-bot/`.

- `app/` — the marketing site and the Chat SDK webhook route.
- `python-bot/` — the discord.py gateway bot with a shared embed builder.
- The bot forwards joins, leaves, role changes, DMs and ticket closures to the
  site via signed portal events.
- `Dockerfile` / `railway.json` — Railway builds and runs the Python bot.
