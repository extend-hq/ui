// Films this video into an MP4, frame by frame, on a computer with Chromium and FFmpeg (a Cool Computers VM: see
// template.md). Nothing runs in real time: each frame is the page shown at its moment, so a slow machine makes a slow
// export, never a jumpy one.
//
//   node export.mjs <folder> <out.mp4>
//
// <folder> holds the video's files (index.html, video.json, player.js…). The drawings are drawn by the Cool Computers
// comment script, as on the site: it is fetched from the public video template and added to the page, with comments
// off, so the film shows the drawings and none of the comment controls.
import puppeteer from 'puppeteer'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { extname, join, normalize } from 'node:path'

const [folder, out] = process.argv.slice(2)
if (!folder || !out) {
  console.error('Usage: node export.mjs <folder> <out.mp4>')
  process.exit(2)
}
const FPS = 30
const STAGE = { width: 1280, height: 720 } // the player's stage; filmed at 1.5 times, 1920 by 1080
const TEMPLATE = 'https://video.cool.computer/'
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff' }

// get reads a URL with curl, which goes through the computer's outbound proxy as every program there does (Node's own
// fetch does not).
const get = async (url, headers = []) => (await promisify(execFile)('curl', ['-fsSL', ...headers.flatMap((header) => ['-H', header]), url], { maxBuffer: 16 << 20 })).stdout

// The comment script, as the site serves it today.
async function commentScript() {
  const page = await get(TEMPLATE, ['sec-fetch-dest: document', 'accept: text/html'])
  const src = /<script src="([^"]+\/__cool\/comments\.[0-9a-f]+\.js)"/.exec(page)?.[1]
  if (!src) throw new Error(`no comment script on ${TEMPLATE}: the drawings cannot be filmed`)
  return get(src)
}

const script = await commentScript()
// Comments off, and a document version, as a video site is served: the script draws the video's drawings and shows
// no comment controls.
const tag = '<script src="/__cool/comments.js" data-comments="off" data-document-version="1"></script>'
const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url, 'http://local').pathname)
  if (path === '/__cool/comments.js') {
    response.writeHead(200, { 'content-type': 'text/javascript' }).end(script)
    return
  }
  const file = normalize(join(folder, path === '/' ? 'index.html' : path))
  if (!file.startsWith(normalize(folder))) {
    response.writeHead(404).end()
    return
  }
  try {
    let body = await readFile(file)
    if (path === '/') body = Buffer.from(body.toString('utf8').replace(/<head>/i, (head) => head + tag))
    response.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream' }).end(body)
  } catch {
    response.writeHead(404).end()
  }
})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

// Anything the page loads from the internet (a font, an image) goes through the computer's proxy too; the page itself
// is served here.
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy
const browser = await puppeteer.launch({
  headless: 'shell',
  args: ['--no-sandbox', '--hide-scrollbars', '--font-render-hinting=none', ...(proxy ? [`--proxy-server=${proxy}`, '--proxy-bypass-list=127.0.0.1;localhost'] : [])]
})
const page = await browser.newPage()
await page.setViewport({ ...STAGE, deviceScaleFactor: 1.5 })
await page.goto(`http://127.0.0.1:${server.address().port}/`)
await page.waitForFunction(() => window.__video, { timeout: 30000 })
// The film is the picture alone: no controls, no pointer.
await page.addStyleTag({ content: '.controls, .start { display: none !important } * { cursor: none !important }' })
const { duration, unmatched } = await page.evaluate(() => ({ duration: window.__video.duration, unmatched: window.__video.unmatched }))
if (unmatched.length) console.warn(`video.json: each el must match exactly one element; these do not, so they are left out: ${unmatched.join(', ')}`)

// shot is the page at a moment, once the comment script has drawn it.
async function shot(ms) {
  await page.evaluate((at) => new Promise((resolve) => {
    window.__video.seek(at)
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  }), ms)
  return page.screenshot({ type: 'png' })
}

// The same moment must show the same picture whatever was shown before it; a page that moves things on its own clock
// does not, and its film would flicker.
const digest = (picture) => createHash('sha256').update(picture).digest('hex')
const probes = [0.2, 0.5, 0.8].map((part) => Math.round(duration * part))
await shot(0)
const first = []
for (const ms of probes) first.push(digest(await shot(ms)))
const again = []
for (const ms of [...probes].reverse()) again.unshift(digest(await shot(ms)))
const moved = probes.filter((_, index) => first[index] !== again[index])
if (moved.length) {
  console.warn(`Warning: the page looked different at ${moved.map((ms) => (ms / 1000).toFixed(1) + ' s').join(', ')} when shown twice. Something on it moves on its own clock (a timer, requestAnimationFrame or will-change): the film may flicker there.`)
}

const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] })
const done = new Promise((resolve, reject) => ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`)))))
const frames = Math.ceil((duration / 1000) * FPS)
const began = Date.now()
for (let frame = 0; frame < frames; frame++) {
  const picture = await shot((frame * 1000) / FPS)
  if (!ffmpeg.stdin.write(picture)) await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve))
  if (frame % (FPS * 5) === 0) console.log(`${Math.round((frame / frames) * 100)}%`)
}
ffmpeg.stdin.end()
await done
await browser.close()
server.close()
console.log(`${out}: ${(duration / 1000).toFixed(1)} s, ${frames} frames at 1920 by 1080, made in ${((Date.now() - began) / 1000).toFixed(0)} s`)
