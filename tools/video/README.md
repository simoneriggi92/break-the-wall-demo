# The launch video and the README's media

A [Remotion](https://www.remotion.dev) project that cuts the macOS screen recording of a session (Claude Code and Break the Wall's page side by side) into the launch video and the README's media, from one cut:

- **LinkedIn**: 1080×1350 (4:5), a title above each shot, the loop's six stages below, and a closing card with the install commands.
- **Readme**: 16:9, the same shots without the closing card, encoded as the README's GIF.
- **ReadmeAnswer, ReadmeAsk, ReadmeCheck**: the README's three short clips, 5 to 8 s each, encoded as WebP.

Every frame is a real event. A shot only speeds up or skips waits, and the camera only frames and zooms.

```
recording.mov ──► npm run proxy ──► public/recording.mp4 (token masked, 3072 px, 30 fps)
                                          │
src/cut.ts (shots: seconds + camera) ─────┴──► compositions
                                                 ├─► npm run render:linkedin ──► out/break-the-wall-linkedin.mp4
                                                 └─► npm run render:readme ────► out/readme/: the GIF and three WebP clips, 960×540
```

## Before the first render

```sh
npm ci
npm run proxy -- "<recording.mov>"   # burns in the masks of ../../cuts/screen.json
npm run check:token                  # reads every second the cut plays; fails if the address shows
npm run dev                          # Remotion Studio
```

`check:token` uses macOS's text recognition through `swift`. Run it again after every change to the cut, before rendering anything you share. The fixed mask hides the address only where it first prints: when the terminal redraws while it scrolls, the address can show further down (74.0 to 75.3 s in the recording of 26 November, which the cut skips).

## Change the cut

[src/cut.ts](src/cut.ts) lists the shots in order. Times and camera positions use the recording's own coordinates (seconds, and pixels of the 4096×2498 screen), the same as [cuts/screen.json](../../cuts/screen.json). A moment found for the README's media therefore goes in unchanged.

- **`from`, `to`, `rate`:** the seconds played, and the speed-up.
- **`camera`:** keys `{ t, cx, cy, w }`. Each key is the centre of the view and how many recording pixels it spans across, held from `t` seconds into the shot. Between keys the camera eases. A view wider or taller than the recording is centred and letterboxed.
- **`tag`, `title`, `stage`:** the header, and the stage marked in the loop strip. A word starting with `/` is drawn as a command.
- **`in`:** the outputs the shot plays in: `video` (LinkedIn and the README's GIF), `answer`, `ask` or `check` (the clips). Absent means `video` only.

To replace the README's media in Break the Wall's repository, after checking them in `out/readme/`:

```sh
node scripts/readme-media.mjs --to ../../../BreakTheWall/docs/images
```

A shot that starts where the previous one ended follows it with a plain cut; any other crossfades over 6 frames. The compositions' length follows the cut.

The shots come from data, so Studio cannot keyframe their camera or timing: edit `src/cut.ts` instead. The closing card's copy is written inline, and Studio can edit it.

## Licence

Remotion is free for individuals and companies of up to three people; larger companies need a [company licence](https://www.remotion.dev/docs/license).
