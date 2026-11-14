// The video player: a page that plays. Everything on the stage is a function of one clock, so the page plays, pauses,
// scrubs, and shows the same picture for the same moment every time.
//
// It owns three things: the clock, the camera, and the page's own animations (CSS animations and Web Animations on
// the stage, held paused and set to the clock). The drawings in video.json are not drawn here. They are handed to the
// Cool Computers comment script, which draws them with the same pen and handwriting as a comment's drawing, as of the
// moment this page says it shows. That script also asks this page to go to a moment: when someone opens a comment left
// at one, or begins to comment and the page should hold still.
//
// No build step: edit this file and publish.

const CAMERA_MS = 1200 // a camera move eases over this long
const GAP_MS = 700 // between one step and the next, when a step gives no time of its own
const TAIL_MS = 1500 // the video runs on this long after its last step
const IDLE_MS = 2200 // while playing, the controls fade after the pointer rests this long
const SKIP_MS = 5000
const FRAME_MS = 1000 / 30

// How long the pen takes over a drawing, near enough to space steps that give no time: it flies in, draws each mark
// (a shape in about a second, words at about a letter every 160 ms), rests, and leaves. The comment script holds the
// exact paces; a step that must start at an exact moment says `at`.
function drawingMs(marks) {
  const drawing = marks.reduce((sum, mark) => sum + (mark.write ? 400 + 160 * mark.write.length : 900), 0)
  return 950 + Math.min(drawing, 9000) + 900
}

const stage = document.querySelector('.stage')
const camera = document.querySelector('.camera')
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const clamp = (value, low, high) => Math.min(high, Math.max(low, value))
const clock = (ms) => Math.floor(ms / 60000) + ':' + String(Math.floor(ms / 1000) % 60).padStart(2, '0')

// ---------------------------------------------------------------------------------------------------------------
// The video: video.json read into drawings (for the comment script), camera shots and a duration.

function plan(video) {
  const drawings = []
  const shots = [{ at: 0, el: null, zoom: 1 }]
  let next = 0 // when the next step starts, if it gives no time of its own
  let end = 0
  for (const step of video.steps || []) {
    const at = typeof step.at === 'number' ? step.at * 1000 : next
    let length = 0
    if (step.camera) {
      shots.push({ at, el: step.camera.el || null, zoom: step.camera.zoom || 1 })
      length = Math.max(length, CAMERA_MS)
    }
    if (step.clear) {
      // Wipe the board: every drawing still on it goes.
      for (const drawing of drawings) if (drawing.until === undefined && drawing.at < at) drawing.until = at
      length = Math.max(length, 400)
    }
    if (step.marks && step.marks.length) {
      // A drawing waits for a camera move in the same step to land.
      const start = at + (step.camera ? CAMERA_MS : 0)
      drawings.push({ at: Math.round(start), by: video.by, marks: step.marks })
      length = Math.max(length, start - at + drawingMs(step.marks))
    }
    if (typeof step.wait === 'number') length = Math.max(length, step.wait * 1000)
    next = at + length + GAP_MS
    end = Math.max(end, at + length)
  }
  return { drawings, shots, end }
}

// unmatched lists the `el` selectors of video.json that do not match exactly one element of the page: a mark on one
// is not drawn, and a camera shot on one stays out.
function unmatched(video) {
  const selectors = (video.steps || []).flatMap((step) => [step.camera && step.camera.el, ...(step.marks || []).map((mark) => mark.el)])
  return [...new Set(selectors.filter(Boolean))].filter((selector) => {
    try {
      return document.querySelectorAll(selector).length !== 1
    } catch {
      return true
    }
  })
}

// ---------------------------------------------------------------------------------------------------------------
// The picture as of a moment.

let duration = 0
let shots = []
let animations = []
let now = 0

// The stage is drawn at its own size (1280 by 720) and scaled to fit the window, with the surround around it.
function fit() {
  const scale = Math.min(window.innerWidth / stage.offsetWidth, window.innerHeight / stage.offsetHeight)
  stage.style.transform = `translate(-50%, -50%) scale(${scale})`
}

// frame works out where each shot puts the camera: its element's centre in the middle of the stage, zoomed, resting
// against the stage's edges rather than past them. Elements are measured once, with the camera at rest and the page's
// animations at their end, so a shot never chases something moving.
function frame() {
  camera.style.transform = 'none'
  for (const animation of animations) animation.currentTime = duration
  const width = stage.offsetWidth
  const height = stage.offsetHeight
  const stageBox = stage.getBoundingClientRect()
  const scale = stageBox.width / width
  for (const shot of shots) {
    const element = shot.el && stage.querySelector(shot.el)
    if (!element || shot.zoom === 1) {
      shot.frame = { x: 0, y: 0, zoom: element ? shot.zoom : 1 }
      continue
    }
    const box = element.getBoundingClientRect()
    const centreX = (box.left - stageBox.left + box.width / 2) / scale
    const centreY = (box.top - stageBox.top + box.height / 2) / scale
    shot.frame = {
      x: clamp(width / 2 - centreX * shot.zoom, width - width * shot.zoom, 0),
      y: clamp(height / 2 - centreY * shot.zoom, height - height * shot.zoom, 0),
      zoom: shot.zoom
    }
  }
}

function cameraAt(ms) {
  let index = 0
  while (index + 1 < shots.length && shots[index + 1].at <= ms) index++
  const to = shots[index].frame
  if (index === 0) return to
  const from = shots[index - 1].frame
  const part = easeInOut(clamp((ms - shots[index].at) / CAMERA_MS, 0, 1))
  return { x: from.x + (to.x - from.x) * part, y: from.y + (to.y - from.y) * part, zoom: from.zoom + (to.zoom - from.zoom) * part }
}

// show puts everything where it is at a moment. It keeps nothing from the frame before, so any moment can follow any
// other.
function show(ms) {
  now = clamp(ms, 0, duration)
  for (const animation of animations) animation.currentTime = now
  const at = cameraAt(now)
  camera.style.transform = `translate(${at.x.toFixed(2)}px, ${at.y.toFixed(2)}px) scale(${at.zoom.toFixed(4)})`
  // The comment script draws the video's drawings as of this moment.
  window.postMessage({ cool: 'video', type: 'now', ms: Math.round(now) }, location.origin)
  controls.draw()
}

// ---------------------------------------------------------------------------------------------------------------
// The clock.

let playing = false
let last = 0

function tick(stamp) {
  if (!playing) return
  const next = now + (stamp - last)
  last = stamp
  if (next >= duration) {
    show(duration)
    pause()
    return
  }
  show(next)
  requestAnimationFrame(tick)
}

function play() {
  // Until video.json is read there is nothing to play.
  if (playing || !duration) return
  if (now >= duration) show(0)
  playing = true
  last = performance.now()
  requestAnimationFrame(tick)
  controls.draw()
  controls.wake()
}

function pause() {
  if (!playing) return
  playing = false
  controls.draw()
  controls.wake()
}

const toggle = () => (playing ? pause() : play())
const seek = (ms) => show(ms)

// The comment script asks for a moment (hold it there), and says at which moments the page's comments were left (dots
// on the timeline).
window.addEventListener('message', (event) => {
  const message = event.data
  if (event.source !== window || event.origin !== location.origin || !message || message.cool !== 'video') return
  if (message.type === 'go' && typeof message.ms === 'number') {
    pause()
    show(message.ms)
  } else if (message.type === 'comments' && Array.isArray(message.moments)) {
    controls.mark(message.moments.filter((ms) => typeof ms === 'number'))
  }
})

// ---------------------------------------------------------------------------------------------------------------
// The controls: one bar that floats at the bottom and fades while the video plays and the pointer rests.

const ICONS = {
  play: '<path d="M7 4.6v14.8a1 1 0 0 0 1.5.86l12.3-7.4a1 1 0 0 0 0-1.72L8.5 3.74A1 1 0 0 0 7 4.6Z"/>',
  pause: '<rect x="6" y="4" width="4.2" height="16" rx="1.2"/><rect x="13.8" y="4" width="4.2" height="16" rx="1.2"/>',
  replay: '<path d="M12 5a7 7 0 1 1-6.93 8h2.02A5 5 0 1 0 12 7v3L7.5 6 12 2v3Z"/>',
  enter: '<path d="M4 9V5a1 1 0 0 1 1-1h4v2H6v3H4Zm11-5h4a1 1 0 0 1 1 1v4h-2V6h-3V4ZM6 15v3h3v2H5a1 1 0 0 1-1-1v-4h2Zm12 0h2v4a1 1 0 0 1-1 1h-4v-2h3v-3Z"/>',
  leave: '<path d="M9 4h2v6a1 1 0 0 1-1 1H4V9h5V4Zm4 0h2v5h5v2h-6a1 1 0 0 1-1-1V4Zm-9 9h6a1 1 0 0 1 1 1v6H9v-5H4v-2Zm10 0h6v2h-5v5h-2v-6a1 1 0 0 1 1-1Z"/>'
}
const icon = (name) => `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">${ICONS[name]}</svg>`

const controls = (() => {
  const bar = document.querySelector('.controls')
  const playButton = bar.querySelector('[data-play]')
  const time = bar.querySelector('[data-time]')
  const rail = bar.querySelector('[data-rail]')
  const fill = bar.querySelector('[data-fill]')
  const thumb = bar.querySelector('[data-thumb]')
  const screenButton = bar.querySelector('[data-screen]')
  const start = document.querySelector('.start')
  let idle = 0
  let started = false

  const asleep = () => document.body.classList.add('is-resting')
  function wake() {
    document.body.classList.remove('is-resting')
    clearTimeout(idle)
    if (playing && !bar.matches(':hover, :focus-within')) idle = setTimeout(asleep, IDLE_MS)
  }

  function draw() {
    const ended = !playing && duration > 0 && now >= duration
    playButton.innerHTML = icon(playing ? 'pause' : ended ? 'replay' : 'play')
    playButton.setAttribute('aria-label', playing ? 'Pause' : ended ? 'Play again' : 'Play')
    time.textContent = clock(now) + ' / ' + clock(duration)
    const part = duration ? (now / duration) * 100 : 0
    fill.style.width = part + '%'
    thumb.style.left = part + '%'
    rail.setAttribute('aria-valuenow', String(Math.round(now / 1000)))
    rail.setAttribute('aria-valuetext', clock(now))
    // The large play button is for the first frame only: playing or moving through the video puts it away.
    if ((playing || now > 0) && !started) {
      started = true
      start.classList.add('is-gone')
    }
  }

  function drawScreen() {
    const full = Boolean(document.fullscreenElement)
    screenButton.innerHTML = icon(full ? 'leave' : 'enter')
    screenButton.setAttribute('aria-label', full ? 'Exit full screen' : 'Full screen')
  }
  const fullScreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {})

  playButton.addEventListener('click', toggle)
  start.addEventListener('click', play)
  screenButton.addEventListener('click', fullScreen)
  document.addEventListener('fullscreenchange', drawScreen)
  if (!document.fullscreenEnabled) screenButton.hidden = true
  drawScreen()

  // Scrubbing: the picture follows the pointer; a video that was playing plays on when it lets go.
  let resume = false
  const scrub = (event) => {
    const box = rail.getBoundingClientRect()
    seek(((event.clientX - box.left) / box.width) * duration)
  }
  rail.addEventListener('pointerdown', (event) => {
    resume = playing
    pause()
    rail.setPointerCapture(event.pointerId)
    scrub(event)
  })
  rail.addEventListener('pointermove', (event) => rail.hasPointerCapture(event.pointerId) && scrub(event))
  rail.addEventListener('pointerup', (event) => {
    if (!rail.hasPointerCapture(event.pointerId)) return
    rail.releasePointerCapture(event.pointerId)
    if (resume) play()
  })
  rail.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') event.stopPropagation()
    if (event.key === 'ArrowLeft') seek(now - SKIP_MS)
    if (event.key === 'ArrowRight') seek(now + SKIP_MS)
  })

  for (const type of ['pointermove', 'pointerdown', 'keydown']) document.addEventListener(type, wake, { passive: true })
  bar.addEventListener('pointerleave', wake)

  document.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
    if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]')) return
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (key === ' ' || key === 'k') {
      // Space on a focused button presses it; anywhere else it plays and pauses.
      if (key === ' ' && event.target instanceof HTMLButtonElement) return
      event.preventDefault()
      toggle()
    } else if (key === 'ArrowLeft' || key === 'j') {
      pause()
      seek(now - (event.shiftKey ? FRAME_MS : SKIP_MS))
    } else if (key === 'ArrowRight' || key === 'l') {
      pause()
      seek(now + (event.shiftKey ? FRAME_MS : SKIP_MS))
    } else if (key === 'Home') {
      seek(0)
    } else if (key === 'End') {
      seek(duration)
    } else if (key === 'f') {
      fullScreen()
    }
  })

  // A dot on the timeline for each moment a comment was left at; pressing one goes there, where its pin shows.
  const dots = bar.querySelector('[data-dots]')
  function mark(moments) {
    dots.replaceChildren(
      ...moments.map((ms) => {
        const dot = document.createElement('button')
        dot.type = 'button'
        dot.style.left = (duration ? clamp(ms / duration, 0, 1) * 100 : 0) + '%'
        dot.setAttribute('aria-label', 'Comment at ' + clock(ms))
        dot.addEventListener('pointerdown', (event) => event.stopPropagation())
        dot.addEventListener('click', () => {
          pause()
          seek(ms)
        })
        return dot
      })
    )
  }

  return { draw, wake, mark }
})()

// ---------------------------------------------------------------------------------------------------------------
// Start: read the video, hold the page's own animations, hand the drawings over, show the first moment.

async function start() {
  const video = await fetch('video.json', { cache: 'no-cache' }).then((response) => response.json())
  await document.fonts.ready
  const planned = plan(video)
  shots = planned.shots
  // The page's own motion: every CSS animation and Web Animation on the stage, from now on moved only by the clock.
  animations = document.getAnimations().filter((animation) => animation.effect && stage.contains(animation.effect.target))
  for (const animation of animations) animation.pause()
  const animated = animations.reduce((end, animation) => Math.max(end, animation.effect.getComputedTiming().endTime || 0), 0)
  duration = typeof video.duration === 'number' ? video.duration * 1000 : Math.max(planned.end + TAIL_MS, animated)
  fit()
  frame()
  const missing = unmatched(video)
  if (missing.length) console.warn('video.json: each el must match exactly one element; these do not:', missing.join(', '))
  window.addEventListener('resize', () => {
    fit()
    frame()
    show(now)
  })
  window.postMessage({ cool: 'video', type: 'ink', drawings: planned.drawings }, location.origin)
  // A link may start at a moment: #t=22.5. In the hash, not the query, so it never makes the page a different page for
  // its comments.
  const linked = () => Number(new URLSearchParams(location.hash.slice(1)).get('t'))
  const from = linked()
  show(Number.isFinite(from) && from > 0 ? from * 1000 : 0)
  // A link to another moment of the same video, followed on the page, goes there.
  window.addEventListener('hashchange', () => {
    const at = linked()
    if (Number.isFinite(at) && at >= 0) {
      pause()
      show(at * 1000)
    }
  })
  // For filming: the export seeks frame by frame and waits for this.
  window.__video = { duration, seek: show, unmatched: missing }
}

start()
