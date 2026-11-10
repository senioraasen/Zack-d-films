# Nøtteregn 3D

A 3D cartoon "what if" short in 9:16, built entirely in code with three.js: procedural cartoon people and props, a blue studio sky, slow-motion impacts, a red force ripple, quick cuts and 1–3 word captions timed to the voice.

**«Hva hadde skjedd om det regnet nøtter?»** – about 32 seconds, Norwegian narration.

## Files
| File | What |
|---|---|
| `script.json` | The script, one sentence per line (one voice file per line in `audio/lines/`). |
| `src/shots.js` | **The edit.** Cut times from the voice, `FADES`, and one function per shot. |
| `src/human.js` | `makeHuman('oldman' \| 'courier' \| 'witch')`: poseable cartoon people (`setPose`, `setMouth`, `setBrows`, `look`, `setEyes`). |
| `src/props.js` | Hazelnut/walnut, nut rain, the winged yellow car «VINGE 1», parked cars, broom, plastic bag, apples, tyre, sparks, chips, red ripple, oil, houses. |
| `src/anim.js` | Keyframes, easing, camera helpers, shake, arm IK. |
| `src/materials.js` | Canvas textures and materials. |
| `src/main.js` | Renderer, sky, lighting, depth of field, bloom, grade, captions, `window.renderAt(t)`. |
| `src/timeline.js` | Generated: line and word times, captions and duration. |
| `tools/timeline.py` | Builds `audio/vo.wav`, `audio.m4a` and `src/timeline.js` from the voice files. |
| `tools/mix.py` | Adds voice, music and sound effects and scales to 1080x1920. |
| `render.mjs` | Headless renderer (Playwright + WebGL). |

## Making the video
```bash
npm install                      # three.js
python3 tools/timeline.py        # voice -> timeline + captions
node render.mjs stills 2.3,8,11.6,21.5 stills     # check frames
node render.mjs video silent.mp4 30               # ~1-3 s per frame without a GPU
python3 tools/mix.py silent.mp4 ../video/noetteregn-3d.mp4
```
Live preview: `python3 -m http.server 8000` and open `index.html` (click to play), or `index.html?t=11.6` for one frame.

Voice: ElevenLabs (via Higgsfield). Music: ElevenLabs Music. Sound effects: Mirelo.
