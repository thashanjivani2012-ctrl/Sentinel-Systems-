"use client"

import { useState } from "react"

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return <button className="copy-button" type="button" aria-label="Copy command" onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>{copied ? "copied" : "copy"}</button>
}
