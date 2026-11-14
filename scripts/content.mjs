// Edit these definitions to change what /rules and /info say. No command code needs to change.

export const rules = {
  title: "Server rules",
  description: "By staying in this server you agree to the rules below. They apply everywhere, including DMs with members of this server.",
  fields: [
    { name: "01 · Be respectful", value: "No harassment, hate speech, discrimination, or personal attacks." },
    { name: "02 · Stay on topic", value: "Use each channel for its purpose and keep conversations in the right place." },
    { name: "03 · No spam", value: "No repeated messages, unsolicited links, or self-promotion without permission." },
    { name: "04 · Keep it safe", value: "No NSFW, gore, or illegal content. Nothing that puts members at risk." },
    { name: "05 · Follow Discord", value: "Discord's Terms of Service and Community Guidelines apply at all times." },
    { name: "Enforcement", value: "Breaking a rule may lead to a warning, mute, or ban at moderator discretion." },
  ],
}

export const info = {
  title: "About Sentinel",
  description: "Sentinel is the utility bot for this server. It answers slash commands, reports its own health, and keeps the server's reference information in one place.",
  fields: [
    { name: "Getting started", value: "Run `/help` to see every command, or `/status` for a live health card." },
    { name: "Useful commands", value: "`/rules` · `/info` · `/serverinfo` · `/userinfo` · `/avatar`" },
  ],
}
