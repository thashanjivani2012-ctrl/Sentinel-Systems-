import { EmbedBuilder } from "discord.js"

export const COLORS = {
  primary: 0x6757e8,
  success: 0x57f287,
  warning: 0xfee75c,
  danger: 0xed4245,
  info: 0x5865f2,
  neutral: 0x2b2d31,
}

const LIMITS = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
  authorName: 256,
}

// Every embed falls back to these values unless the call site overrides them.
export const theme = {
  color: "primary",
  author: null,
  footer: "Sentinel Systems",
  footerIconURL: null,
  thumbnailURL: null,
  imageURL: null,
  timestamp: true,
}

// Change the look of every embed in one place, e.g. configureTheme({ color: "info", footer: "…" }).
export function configureTheme(overrides = {}) {
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) theme[key] = value
  }
  return theme
}

export function field(name, value, inline = true) {
  return { name, value, inline }
}

function clip(value, max) {
  const text = String(value ?? "")
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function resolveColor(color) {
  if (typeof color === "number") return color
  return COLORS[color] ?? COLORS[theme.color] ?? COLORS.primary
}

function resolveAuthor(author) {
  if (!author) return null
  const spec = typeof author === "string" ? { name: author } : author
  if (!spec?.name) return null
  return { ...spec, name: clip(spec.name, LIMITS.authorName) }
}

export function buildEmbed(spec = {}) {
  const {
    color,
    title,
    description,
    fields = [],
    author,
    footer,
    footerIconURL,
    thumbnailURL,
    imageURL,
    url,
    timestamp,
  } = spec

  const embed = new EmbedBuilder().setColor(resolveColor(color))

  if (title) embed.setTitle(clip(title, LIMITS.title))
  if (description) embed.setDescription(clip(description, LIMITS.description))
  if (url) embed.setURL(url)

  const authorSpec = resolveAuthor(author ?? theme.author)
  if (authorSpec) embed.setAuthor(authorSpec)

  const usableFields = fields
    .filter((item) => item?.name && item?.value)
    .slice(0, 25)
    .map((item) => ({
      name: clip(item.name, LIMITS.fieldName),
      value: clip(item.value, LIMITS.fieldValue),
      inline: item.inline ?? false,
    }))
  if (usableFields.length) embed.addFields(usableFields)

  const thumbnail = thumbnailURL ?? theme.thumbnailURL
  if (thumbnail) embed.setThumbnail(thumbnail)

  const image = imageURL ?? theme.imageURL
  if (image) embed.setImage(image)

  const footerText = footer ?? theme.footer
  if (footerText) {
    embed.setFooter({
      text: clip(footerText, LIMITS.footer),
      iconURL: footerIconURL ?? theme.footerIconURL ?? undefined,
    })
  }

  if (timestamp ?? theme.timestamp) embed.setTimestamp()

  return embed
}

// Turns a content definition from content.mjs into a ready-to-send embed.
export function contentEmbed(definition, overrides = {}) {
  return buildEmbed({
    title: definition.title,
    description: definition.description,
    fields: definition.fields,
    ...overrides,
  })
}
