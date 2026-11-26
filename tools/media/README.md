# Recording and cutting the media

These tools record a real Claude Code session in this repository beside Break the Wall's page, then cut it into the README's media: one heading GIF with captions, and short WebP clips. Every frame is a real event. Cutting only removes waits, and never stages anything.

```
take.sh start ──► tmux runs claude ──► ttyd shows it in a browser window ─┐
                                                                          ├─► record.mjs records both windows
drive.mjs ──► real clicks and keys on Break the Wall's page ──────────────┘   on one timeline
take.sh stop ──► compose: takes/<name>/take.mp4 (terminal left, page right) + marks.json
cut.mjs cuts/<name>.json ──► media/<name>/: the GIF and the clips
```

## Before the first take

On the recording machine, with Homebrew:

```sh
brew install ffmpeg ttyd webp tmux
cd tools/media && npm ci
```

- **Chrome:** the recorder drives the installed Google Chrome, so Playwright downloads no browser.
- **Density:** each window lays out at 1280×800 and is recorded at twice the density, 2560×1600, as on a Retina screen. Playwright's own video captures a page at its CSS size, so the recorder takes 20 screenshots a second instead and pipes them to Homebrew's ffmpeg.
- **Homebrew's ffmpeg:** the bottle has no caption filter and no WebP encoder. The captions are drawn by the browser instead, and the clips are animated by `img2webp`, from `webp`.

None of these tools is a dependency of Break the Wall.

## Record a take

The person's choices for a take are in [docs/take.md](../../docs/take.md). From the repository's root:

```sh
tools/media/take.sh start main claude                # or: claude --plugin-dir <path>
tools/media/take.sh keys main "/break-the-wall"      # types into claude, then Enter
tools/media/take.sh screen main                      # what the terminal shows now
node tools/media/drive.mjs takes/main goto <the page's address, as printed>
node tools/media/drive.mjs takes/main click-role button "Accept the recommendation"
node tools/media/drive.mjs takes/main mark "answer Q1"
tools/media/take.sh stop main                        # composes takes/main/take.mp4
```

`drive.mjs` lists its commands at the top of the file:

- **Clicks** move the pointer there first, so a viewer can follow them.
- **`wait-text`** and **`wait-gone`** wait on the page: for a round to show, or for the spec's structure to finish.
- **`mark`** puts a label on the timeline. After `stop`, `takes/<name>/marks.json` holds the marks in seconds, ready for the cuts file.

The take is set up so it never depends on what the machine has seen before:

- **Profile:** set `CLAUDE_CONFIG_DIR` before `start` to run `claude` in a clean profile.
- **History:** Break the Wall keeps its history per computer user, not per profile. So each take gets its own empty history in `takes/<name>/btw-data`.
- **Continuing a session:** `BTW_USER_DATA_DIR` reuses another take's history, for a take that continues the same session with `claude --continue`.
- **Page:** the page opens in the paper theme, in English.

## Cut it

A cuts file names its takes in the order they were recorded. It then lists the moments of the GIF, each with a caption, and of each clip:

```json
{
  "takes": { "main": "../takes/main/take.mp4" },
  "gif": { "file": "break-the-wall.gif", "width": 1280, "moments": [{ "start": 12.0, "end": 14.5, "caption": "Type /break-the-wall" }] },
  "clips": [{ "file": "answer-one-question.webp", "view": "page", "width": 800, "moments": [{ "start": 145.2, "end": 151.7 }] }]
}
```

```sh
node tools/media/cut.mjs cuts/main.json              # writes media/main/
```

The script checks the cuts file before it writes anything, and refuses it with the reason when:

- the GIF does not last 25 to 35 s, or a clip 5 to 8 s;
- a moment goes back in time, or back to an earlier take;
- a moment ends past the end of its take.

Other rules for the cuts file:

- **Views:** `view` keeps `both` halves, the `terminal` or the `page`. A moment can set its own `view`, so the GIF shows one window at a time at full size: the README is about 1000 px wide, and two windows side by side would show each at half that.
- **Zooms:** a moment can frame a region of its window, `"zoom": { "x": 240, "y": 60, "width": 800 }`, in the window's 1280×800 pixels, its height following the window's proportions. Recorded at twice the density, the region stays sharp: a diagram or the spec's structure, close up.
- **Several takes:** a moment from a take other than the first names it with `"take"`.
- **Example:** [cuts/take2x.json](../../cuts/take2x.json) cuts the trial take of the whole loop.

## Tests

```sh
cd tools/media && npm test
```

The tests run the cut and the composition on synthetic recordings that ffmpeg generates. The recorder itself is checked by recording a take.
