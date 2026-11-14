# Video

A page that plays like a video. You write an ordinary page and a list of what to draw on it; the player plays it with
a clock people can pause and scrub, and people comment on a moment the way they comment on any page. Nothing is
recorded and there is no build step: edit the files and publish.

A video is silent. The story is told by the page itself (text and pictures that appear in turn) and by a few handwritten
words beside what you point at: put the sentences on the page, and keep handwritten words to a short label.

## The files

| File | What it is | Change it? |
| --- | --- | --- |
| `index.html` | The stage: your content, inside `<div class="camera">`, drawn at 1280 by 720 | Yes: this is your video |
| `video.json` | What to draw, and where the camera goes, in order | Yes |
| `player.js` | The clock, the camera and the controls | Only to change how the player works |
| `player.css` | How the player looks | Only to change how the player looks |
| `artifact.json` | Declares the site a video | No |
| `export.mjs` | Films the video into an MP4, on a computer with a VM | No |

## video.json

```json
{
  "by": "Claude",
  "steps": [
    { "marks": [{ "el": "#total", "shape": "ring", "color": "red" }] },
    { "marks": [{ "el": "#total", "write": "up 12% since June", "color": "red" }] },
    { "camera": { "el": "#chart", "zoom": 1.6 } },
    { "clear": true, "camera": { "zoom": 1 } }
  ]
}
```

- `by` is the name on the pen.
- Each step is done in turn. A step without `at` starts when the one before it is done, so most videos need no times.
- `marks` are drawn by the pen, in the same grammar as `cool comments leave --marks`. Each mark is on one element `el`
  (a selector that matches exactly one element) and is one of `"shape": "ring" | "box" | "underline" | "strike" | "cross"`,
  `"write": "<a few words>"` or `"path"`. `"color"` is `amber` (the default), `blue`, `red`, `green`, `purple` or `ink`.
- `camera` zooms in on an element (`"el"`, `"zoom"`), or back out with `{ "zoom": 1 }`. Drawings in the same step wait
  for the camera to land.
- `clear` wipes every drawing made so far, so later drawings are not drawn over old ones.
- `at` (seconds) starts a step at that moment instead. `wait` (seconds) holds before the next step.
- `duration` (seconds, at the top level) sets the length; without it the video ends shortly after its last step.

How long it runs: a camera move takes 1.2 s; a drawing about 1.9 s for the pen to come and go, plus about 0.9 s a shape
and 0.4 s plus 0.16 s a letter for written words; steps are 0.7 s apart, and the video ends 1.5 s after its last step.
A zoom of 2 shows a quarter of the stage around its element, stopping at the stage's edges.

## Motion in the page

Anything that moves on the page, such as text appearing or a chart growing, must be a CSS animation or a Web
Animation. Its delay is its moment in the video: `animation: reveal 0.6s ease 9.8s both` appears at 9.8 seconds. The
player holds every animation and sets its time, so scrubbing and replaying always show the same picture.

For the same reason, don't use timers, `requestAnimationFrame`, the clock or unseeded randomness to move things, and
don't put `will-change: transform` on the camera. Video and canvas content does not follow the clock.

## How people watch it

- Space or K plays and pauses; arrows or J and L skip 5 seconds (with Shift, one frame); F is full screen.
- While it plays, the controls fade when the pointer rests.
- A link can start at a moment: `https://<site>.cool.computer/#t=22.5`.
- Comments: press C or the Comment button. The video pauses, and the comment is left at that moment. Its pin shows near
  that moment, and opening it takes the video back there. Your agent reads the moment as `anchor.moment_ms` and
  `cool comments` prints it as `at 0:22 in the video`. A comment that asks for a change in the video is answered in
  the video: change `video.json` (or the page) at that moment, publish again, then resolve the comment. Drawing on the
  page with `cool comments leave` leaves the video as it was.

The drawings are drawn by the Cool Computers comment script. `artifact.json` declares the site a video, so they show
even when the site's comments are switched off. Keep it, and keep `video.json` at the site's root.

## An MP4 to email or post

`export.mjs` films the video frame by frame into a 1920 by 1080 MP4. It needs Chromium and FFmpeg, so run it on a
Cool Computers VM (Pro plan), never on the user's machine. Make one computer for it once and keep it for every export:

```
cool create video-render --visibility private
cool exec video-render 'sudo apt-get update && sudo apt-get install -y ffmpeg libnss3 libatk-bridge2.0-0t64 libcups2t64 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 && mkdir -p render && cd render && npm init -y && npm i puppeteer'
```

Then for each video, from the folder that holds its files:

```
cool files upload video-render ./<name> /home/runtime/render
cool exec video-render 'cd render && node <name>/export.mjs <name> <name>.mp4'
cool files download video-render /home/runtime/render/<name>.mp4 ./<name>.mp4
```

It takes about three seconds a second of video. A warning that the page looked different twice means something on it
moves on its own clock (see Motion in the page): the film may flicker there.

