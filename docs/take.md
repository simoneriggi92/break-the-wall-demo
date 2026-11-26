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

- A clean profile, in English, with Break the Wall and the round skills from `mattpocock/skills` installed, as Break the Wall's README says.
- The working directory is the root of this repository, on a clean `main`, with no `.scratch/`, `GLOSSARY.md` or `docs/adr/` left from an earlier take.
- The page in its default theme, at 1280×800.

## The person's intentions, in order

1. **Open the page.** In the terminal, type `/break-the-wall`, then open the page at the address it prints.
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
5. **Send.** Send the round's answers, then watch the agent go on in the terminal. Answer each later round as point 3 says, with no other side chat.
6. **Hand over the spec.** When the agent says the grilling is done, type `/to-spec` in the terminal. If it asks where the spec goes, answer *a local file, as CLAUDE.md says*. If it asks to confirm the test seams, accept them. The spec opens in the page beside the terminal.
7. **Remark on one unbacked statement.** Open *Backing* and choose one statement marked *Unbacked*: prefer a confident sentence about behaviour (a limit, a header, a status code) over a sentence of context. Select it and add a *Remark*:

   > I never decided this: ask me.

   Send the remark. The agent opens the next round: answer it as point 3 says and send. The agent hands over the revised spec, which opens as a new version.
8. **Approve.** Approve the new version, even if it still has unbacked or broken statements. The take ends when the page shows the version approved and *Sent to the agent*.

## When a take cannot follow them

- **No statement is marked unbacked** at point 7. The story cannot be told without staging it. End the take and redo it.
- **The agent never asks about storage.** Point 3's choice is not part of this take. Cut it anyway if every other moment happened.
- **The page or the plugin misbehaves.** Stop the take and file what happened as an issue on Break the Wall. A take is never cut around a defect.

## After the take

The next step, tickets for example, is the person's to type in the terminal. It is not part of the take. Reset the repository before the next take: delete `.scratch/`, `GLOSSARY.md` and `docs/adr/`, and restore anything else the session changed.
