import os
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("DISCORD_TOKEN", "")
APPLICATION_ID = int(os.getenv("APPLICATION_ID") or 0) or None
GUILD_ID = int(os.getenv("GUILD_ID") or 0) or None
