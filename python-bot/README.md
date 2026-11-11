# Python Discord bot (not deployed)

discord.py starter with `/ping` and `/help`. Separate from the Node bot that Railway runs from the repo root.

    cp .env.example .env   # fill in DISCORD_TOKEN, APPLICATION_ID, optional GUILD_ID
    uv sync
    uv run python -m bot.main

Add commands as new files in `bot/cogs/`.
