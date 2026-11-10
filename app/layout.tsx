import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Sentinel Bot | Discord starter",
  description: "A production-ready Discord bot template built with Chat SDK and Next.js.",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
