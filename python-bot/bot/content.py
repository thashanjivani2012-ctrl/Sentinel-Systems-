"""Editable text for /rules and /info. No command code needs to change."""

from bot.embeds import DIVIDER

RULES = {
    "title": "Server Rules",
    "description": (
        f"{DIVIDER}\n"
        "Welcome to the server! By staying here you agree to the rules below.\n"
        "These apply **everywhere**, including DMs with members of this server.\n"
        f"{DIVIDER}"
    ),
    "fields": [
        {
            "name": "**01 · Respect Everyone**",
            "value": (
                "> Treat every member with respect. No harassment, hate speech, "
                "discrimination, or personal attacks of any kind.\n"
                "> Disagreements are fine — hostility is not."
            ),
            "inline": False,
        },
        {
            "name": "**02 · Stay On Topic**",
            "value": (
                "> Use each channel for its intended purpose. Keep conversations in "
                "the right place and avoid derailing threads."
            ),
            "inline": False,
        },
        {
            "name": "**03 · No Spam or Self-Promotion**",
            "value": (
                "> No repeated messages, unsolicited links, or excessive tagging. "
                "Self-promotion is only allowed with explicit permission."
            ),
            "inline": False,
        },
        {
            "name": "**04 · Keep It Safe**",
            "value": (
                "> No NSFW, gore, or illegal content. Nothing that puts members at "
                "risk. Keep all content appropriate for all ages."
            ),
            "inline": False,
        },
        {
            "name": "**05 · Follow Discord's Rules**",
            "value": (
                "> Discord's Terms of Service and Community Guidelines apply at all "
                "times. Violating them may result in a ban."
            ),
            "inline": False,
        },
        {
            "name": "**06 · Listen to Staff**",
            "value": (
                "> Staff decisions are final. If you disagree, appeal respectfully "
                "through the proper channels — do not argue in public."
            ),
            "inline": False,
        },
        {
            "name": "**Enforcement**",
            "value": (
                "> Breaking a rule may lead to a warning, mute, kick, or ban at "
                "moderator discretion depending on severity and history."
            ),
            "inline": False,
        },
    ],
}

INFO = {
    "title": "About Sentinel",
    "description": (
        f"{DIVIDER}\n"
        "Sentinel is the all-in-one utility bot for this server. It handles "
        "commands, moderation tools, server information, and keeps everything "
        "running smoothly.\n"
        f"{DIVIDER}"
    ),
    "fields": [
        {
            "name": "**What Sentinel Does**",
            "value": (
                "> • Slash commands for info, fun, and server utilities\n"
                "> • Real-time server status and health monitoring\n"
                "> • User and server information lookups\n"
                "> • Fun commands like dice rolls, coin flips, and 8-ball"
            ),
            "inline": False,
        },
        {
            "name": "**Getting Started**",
            "value": (
                "> • Run `/help` to see every available command\n"
                "> • Run `/status` for a live health card\n"
                "> • Run `/rules` to review the server rules\n"
                "> • Run `/info` for bot details"
            ),
            "inline": False,
        },
        {
            "name": "**Useful Commands**",
            "value": (
                "> `/ping` · `/status` · `/help` · `/rules` · `/info`\n"
                "> `/uptime` · `/serverinfo` · `/userinfo` · `/avatar`\n"
                "> `/roll` · `/coinflip` · `/8ball`"
            ),
            "inline": False,
        },
        {
            "name": "**Need Help?**",
            "value": (
                "> If you experience issues or need assistance, contact a staff "
                "member or open a ticket in the support channel."
            ),
            "inline": False,
        },
    ],
}