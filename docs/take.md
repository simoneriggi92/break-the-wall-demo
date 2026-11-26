# The intentions for a take

A take is one real Claude Code session in this repository, recorded for Break the Wall's media. The agent's words change from take to take. The person's choices below do not, so every take tells the same story. Nothing is staged: if a take cannot follow these intentions, it is not cut. It is redone, or what it turned up is filed as an issue.

## The story

```
/break-the-wall → grill the ticket → round 1, one question at a time
  → side chat on the API key middleware, reply attached → Send
  → the agent goes on in the terminal → more rounds, same choices
  → /to-spec → the spec opens beside the terminal
  → one unbacked statement → a remark on it → the next round
  → the revised spec → Approve
```

## Before the take

- A clean Claude Code profile, in English, with Break the Wall installed from its marketplace (`/plugin marketplace add simoneriggi92/BreakTheWall`, then `/plugin install break-the-wall@break-the-wall`) and the round skills from [mattpocock/skills](https://github.com/mattpocock/skills).
- The working directory is the root of this repository, on a clean `main`, with no `.scratch/`, `GLOSSARY.md` or `docs/adr/` left from an earlier take.
- How the take is recorded, and at what size and theme, belongs to the recording, not to these intentions.

## The person's intentions, in order

1. **Open the page.** In the terminal, type `/break-the-wall`. The page opens in the browser on its own.
2. **Start the grilling.** In the terminal, type:

   ```
   /grill-with-docs Add rate limiting per API key, the ticket in README.md
   ```

3. **Answer one question at a time, in the page.** On every question, choose the option the agent recommends, except where the counts live:
   - **Storage: in memory.** On the question of where the request counts are kept, choose the in-memory option, even when it is not the recommended one. If no option says in memory, answer with a note: *In memory: one instance, and counts may reset on a restart.*
   - A question with no options gets the recommendation, written as a short note in the person's words.
4. **Ask beside one question.** On the first question that touches the API key middleware (where the limiter sits, what it counts, or what a request without a key costs), open *Ask about this question* and ask:

   > Does the limiter run before or after ApiKeyMiddleware, and what does a request without a valid key count against?

   When the reply comes, use *📎 Attach to answer*, then answer that question as point 3 says. If no question touches the middleware, ask on the question about what the limit is counted against.
5. **Ask for a diagram, then send.** Before sending round 1, add a general note:

   > Next round, draw a Mermaid diagram of where the limiter sits in the request pipeline, next to ApiKeyMiddleware.

   Send the round's answers, then watch the agent go on in the terminal. The next round shows the diagram in the page: fold the questions («) and the right column (») so it takes the whole width, stay on it a few seconds, then unfold both. Answer each later round as point 3 says, with no other side chat.
6. **Hand over the spec.** When the agent says the grilling is done, type `/to-spec` in the terminal. If it asks where the spec goes, answer *a local file, as CLAUDE.md says*. If it asks to confirm the test seams, accept them. The spec opens in the page beside the terminal.
7. **Remark on one unbacked statement.** First wait until the page has drawn the spec's structure: *Claude Code is writing the spec's structure…* gives way to the diagram. A remark made before that hides the diagram from the take. Fold the index of the source, so the structure gets half the window, and take a few steps of its guide. Then open *Backing* and choose one statement marked *Unbacked*: prefer a confident sentence about behaviour (a limit, a header, a status code) over a sentence of context. Add a *Remark* on it, then close *Backing*, so the remark's panel does not cover the spec:

   > I never decided this: ask me.

   Send the remark. The agent opens the next round: answer it as point 3 says and send. The agent hands over the revised spec, which opens as a new version. If the agent's next round does not show in the page, this is the plugin misbehaving (see below), not a moment to work around.
8. **Approve.** Approve the new version, even if it still has unbacked or broken statements. The take ends when the page shows the version approved and *Sent to the agent*.

## When a take cannot follow them

- **No statement is marked unbacked** at point 7. The story cannot be told without staging it. End the take and redo it.
- **The storage choice does not show.** The agent never asks where the counts live, or it recommends in memory itself, so choosing in memory is no exception. The story is missing a moment. Redo the take.
- **The page or the plugin misbehaves.** Stop the take and file what happened as an issue on Break the Wall. A take is never cut around a defect.

## After the take

The next step, tickets for example, is the person's to type in the terminal. It is not part of the take. Reset the repository before the next take: delete `.scratch/`, `GLOSSARY.md` and `docs/adr/`, and restore anything else the session changed.
