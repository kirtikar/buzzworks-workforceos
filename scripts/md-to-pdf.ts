/* eslint-disable */
// Render a Markdown file to a styled PDF using playwright's headless
// Chromium. Approximates the visual style of professional consulting
// scope documents — clean sans-serif body, bordered tables, monospaced
// code blocks for ASCII diagrams, generous margins.
//
// Usage:
//   npx tsx scripts/md-to-pdf.ts <input.md> [output.pdf]
//
// If output is omitted, writes alongside the input with a .pdf extension.

import { chromium } from "playwright"
import { marked } from "marked"
import * as fs from "node:fs"
import * as path from "node:path"

function renderMarkdownToHtml(md: string): string {
  // GFM = tables / strikethrough / autolinks. breaks = render single
  // newlines as <br> (matches our authoring style in MD).
  marked.setOptions({ gfm: true, breaks: false })
  return marked.parse(md) as string
}

const CSS = `
  @page {
    size: A4;
    margin: 22mm 18mm 22mm 18mm;
  }
  :root {
    --ink: #1a1a1a;
    --ink-soft: #4a4a4a;
    --ink-mute: #6b6b6b;
    --border: #d4d4d4;
    --border-strong: #a0a0a0;
    --accent: #2563eb;
    --code-bg: #f6f8fa;
    --table-stripe: #fafafa;
    --rule: #e5e5e5;
  }
  * { box-sizing: border-box; }
  html, body {
    font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI",
                 "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.45;
    color: var(--ink);
    margin: 0;
    padding: 0;
  }
  h1 {
    font-size: 22pt;
    font-weight: 700;
    margin: 0 0 6pt 0;
    color: var(--ink);
    letter-spacing: -0.01em;
  }
  h2 {
    font-size: 14pt;
    font-weight: 700;
    margin: 22pt 0 8pt 0;
    color: var(--ink);
    padding-bottom: 4pt;
    border-bottom: 0.5pt solid var(--rule);
    letter-spacing: -0.005em;
    page-break-after: avoid;
  }
  h3 {
    font-size: 12pt;
    font-weight: 600;
    margin: 16pt 0 6pt 0;
    color: var(--ink);
    page-break-after: avoid;
  }
  h4 {
    font-size: 10.5pt;
    font-weight: 600;
    margin: 12pt 0 4pt 0;
    color: var(--ink-soft);
    page-break-after: avoid;
  }
  p {
    margin: 0 0 8pt 0;
    text-align: justify;
    hyphens: auto;
  }
  blockquote {
    margin: 8pt 0 12pt 0;
    padding: 8pt 12pt;
    border-left: 2.5pt solid var(--accent);
    background: #f0f6ff;
    color: var(--ink-soft);
    font-size: 10pt;
  }
  blockquote p:last-child { margin-bottom: 0; }
  ul, ol {
    margin: 4pt 0 10pt 0;
    padding-left: 18pt;
  }
  li { margin: 2pt 0; }
  li > p { margin: 0 0 4pt 0; }
  strong { color: var(--ink); font-weight: 600; }
  em { color: var(--ink-soft); }
  a {
    color: var(--accent);
    text-decoration: none;
    border-bottom: 0.4pt solid #93c5fd;
  }
  hr {
    border: none;
    border-top: 0.5pt solid var(--rule);
    margin: 14pt 0;
  }
  code {
    font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace;
    font-size: 9pt;
    background: var(--code-bg);
    padding: 1pt 4pt;
    border-radius: 3pt;
    color: #b91c1c;
  }
  pre {
    background: var(--code-bg);
    border: 0.5pt solid var(--border);
    border-radius: 4pt;
    padding: 8pt 10pt;
    overflow: visible;
    white-space: pre;
    page-break-inside: avoid;
    margin: 8pt 0 12pt 0;
  }
  pre code {
    background: transparent;
    padding: 0;
    color: var(--ink);
    font-size: 8.5pt;
    line-height: 1.4;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 8pt 0 14pt 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
  }
  thead { background: #f0f0f0; }
  th {
    text-align: left;
    font-weight: 600;
    padding: 5pt 7pt;
    border: 0.5pt solid var(--border-strong);
    color: var(--ink);
    font-size: 9pt;
  }
  td {
    padding: 5pt 7pt;
    border: 0.5pt solid var(--border);
    vertical-align: top;
    color: var(--ink-soft);
  }
  tbody tr:nth-child(even) { background: var(--table-stripe); }

  /* Header block of the document — first block of front-matter. */
  h1 + p { font-size: 11pt; color: var(--ink-mute); margin-top: -2pt; }

  /* Avoid orphaned headings / table rows split across pages. */
  table, pre, blockquote { page-break-inside: avoid; }
  h2, h3, h4 { page-break-after: avoid; }
`

const TEMPLATE = (body: string, title: string) => `<!doctype html>
<html><head>
<meta charset="utf-8" />
<title>${title}</title>
<style>${CSS}</style>
</head><body>${body}</body></html>`

async function main() {
  const [inputArg, outputArg] = process.argv.slice(2)
  if (!inputArg) {
    console.error("Usage: tsx scripts/md-to-pdf.ts <input.md> [output.pdf]")
    process.exit(1)
  }
  const inputPath  = path.resolve(inputArg)
  const outputPath = path.resolve(outputArg ?? inputPath.replace(/\.md$/i, ".pdf"))

  console.log(`→ reading ${inputPath}`)
  const md = fs.readFileSync(inputPath, "utf-8")

  console.log(`→ rendering markdown via marked`)
  const bodyHtml = renderMarkdownToHtml(md)

  // Derive a document title from the first heading.
  const titleMatch = md.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1] : path.basename(inputPath)

  const html = TEMPLATE(bodyHtml, title)
  const tmpHtmlPath = outputPath.replace(/\.pdf$/i, ".tmp.html")
  fs.writeFileSync(tmpHtmlPath, html)

  console.log(`→ launching chromium to print PDF`)
  // Reuse the chromium-1217 headless shell that the timesheet scraper
  // already installed, so we don't need to re-download a fresh browser
  // each time the playwright dep is re-installed.
  const fallback = "/Users/kirtikar/Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell"
  const exec = fs.existsSync(fallback) ? fallback : undefined
  const browser = await chromium.launch({ headless: true, executablePath: exec })
  try {
    const page = await browser.newPage()
    await page.goto("file://" + tmpHtmlPath, { waitUntil: "networkidle" })
    await page.pdf({
      path: outputPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    })
    console.log(`✓ wrote ${outputPath}`)
  } finally {
    await browser.close()
    fs.unlinkSync(tmpHtmlPath)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
