import { CopyButton } from "@/components/copy-button"

const commands = [
  { command: "/ping", description: "Check bot health and latency." },
  { command: "help", description: "List commands inside a subscribed thread." },
]

export default function Home() {
  return (
    <main className="shell">
      <nav className="nav"><div className="brand"><span className="brand-mark">S</span><span>sentinel<span className="muted">.bot</span></span></div><a className="nav-link" href="#setup">Setup guide <span aria-hidden="true">↗</span></a></nav>
      <section className="hero">
        <div className="eyebrow"><span className="status-dot" /> DISCORD BOT TEMPLATE</div>
        <h1>Ship your next Discord bot<br /><em>with a head start.</em></h1>
        <p className="lede">A clean, extensible foundation for bots that need to move from idea to server without the ceremony.</p>
        <div className="hero-actions"><a className="button primary" href="#setup">Get started <span>→</span></a><a className="button secondary" href="https://chat-sdk.dev/docs" target="_blank" rel="noreferrer">Read the docs <span>↗</span></a></div>
        <div className="command-strip"><span className="prompt">$</span><code>npm install && npm run dev</code><CopyButton text="npm install && npm run dev" /></div>
      </section>
      <section className="grid-section"><div className="section-label">01 / INCLUDED</div><div className="feature-grid"><article><div className="icon">⌁</div><h2>Chat SDK native</h2><p>One normalized bot runtime with Discord webhooks, threads, subscriptions, and room to grow.</p></article><article><div className="icon">◇</div><h2>Serverless ready</h2><p>Built for Next.js App Router with a webhook route that works cleanly on Vercel.</p></article><article><div className="icon">/</div><h2>Start focused</h2><p>A tiny command surface you can replace with your own moderation, utility, or community tools.</p></article></div></section>
      <section className="setup" id="setup"><div className="section-label">02 / QUICK SETUP</div><div className="setup-layout"><div><h2>From zero to<br /><em>first command.</em></h2><p>Connect your Discord application, add the environment variables, and deploy. The starter route is already wired to receive events.</p></div><div className="steps"><div className="step"><span>01</span><div><strong>Create a Discord application</strong><p>Copy the bot token and configure your webhook URL.</p></div></div><div className="step"><span>02</span><div><strong>Add environment variables</strong><p><code>DISCORD_BOT_TOKEN</code> and <code>DISCORD_BOT_USERNAME</code></p></div></div><div className="step"><span>03</span><div><strong>Deploy, then invite</strong><p>Use your deployed URL at <code>/api/webhooks/discord</code>.</p></div></div></div></div></section>
      <section className="commands"><div className="section-label">03 / EXAMPLE COMMANDS</div><div className="command-list">{commands.map((item) => <div className="command-row" key={item.command}><code>{item.command}</code><span>{item.description}</span><span className="arrow">↗</span></div>)}</div></section>
      <footer><span>sentinel.bot / discord starter</span><span>Built with Chat SDK + Next.js</span></footer>
    </main>
  )
}
