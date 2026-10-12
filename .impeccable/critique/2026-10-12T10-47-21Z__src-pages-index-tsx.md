---
target: CarciOscar session entry and core session flow
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:D:\\Marco\\Repo\\movie-tally-time\\src\\pages\\Index.tsx"
target_fingerprint: "sha256:cf9cff7a5192dfb0ddee6d87e7b655225ade165b8438ff70b476cdbd74c62fe5"
target_path: "D:\\Marco\\Repo\\movie-tally-time\\src\\pages\\Index.tsx"
timestamp: 2026-10-12T10-47-21Z
slug: src-pages-index-tsx
---
## CarciOscar interface critique

### Design health score

| # | Heuristic | Score | Key issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 2/4 | Invalid or failed session lookup returns to session creation without explaining why. |
| 2 | Match System / Real World | 3/4 | The movie-night flow is clear; “proposal” is less natural than “suggestion.” |
| 3 | User Control and Freedom | 2/4 | A watched movie is described as irreversible, with no recovery path. |
| 4 | Consistency and Standards | 3/4 | Session tabs are consistent, but Watched Movies and Stats move to a separate menu. |
| 5 | Error Prevention | 2/4 | The three-suggestion limit and confirmations help; input validation and context are sparse. |
| 6 | Recognition Rather Than Recall | 3/4 | Labeled tabs and suggestion counts help, but identity selection is tucked in a menu. |
| 7 | Flexibility and Efficiency | 2/4 | Quick voting helps, but rating remains one movie at a time. |
| 8 | Aesthetic and Minimalist Design | 3/4 | The entry screen is focused; the Rate view’s two voting routes overlap. |
| 9 | Error Recovery | 2/4 | Failed session creation gives a generic retry toast; bad links look like a fresh visit. |
| 10 | Help and Documentation | 1/4 | There is no visible help or contextual guidance. |
| **Total** |  | **23/40** | **Acceptable; improve identity clarity and session-link recovery first.** |

### Design specificity verdict

**Moderately product-aware in behavior, visually category-interchangeable from the source evidence.** Presence-based rankings, five-star interest ratings, and the three-suggestion cap fit the group movie-night task. The root screen is a centered “Create New Session” card; the CarciOscar wordmark and cinema gradient add a brand cue, while the surrounding patterns are familiar cards, tabs, and menus.

The detector found **0 issues** in `src/pages/Index.tsx` (`detect --json` returned `[]`, exit 0). There are no detector findings to reconcile with the source review. Live visual inspection was unavailable because no browser or tabs were available; creating a fresh browser tab failed. No reliable user-visible overlay is available.

### Overall impression

The core group flow has thoughtful rules and a sensible low-friction start. The biggest opportunity is to make session identity and session-link failures explicit: both affect whether people can participate in the shared decision, yet neither is clear at the moment it matters.

### What’s working

- **Presence affects the decision.** People cards expose attendance, and the ranking reflects who is available.
- **The suggestion cap is legible.** Per-person counts communicate the limit, and add controls disappear when it is reached.
- **The flow reveals complexity progressively.** Labeled session tabs persist, proposal cards collapse, and quick voting is available as an optional route.

### Priority issues

1. **[P1] Identity is hidden and called optional, although voting depends on it.** The session menu says “Select who you are (optional),” while Quick voting tells users to select themselves there. A participant may reach voting without knowing why their rating control is unavailable. Make identity selection an explicit setup step and keep the selected person visible in the session view. **Suggested command:** `$impeccable clarify`. Evidence: session menu in `MovieSelector/index.tsx`; empty state in `QuickVotingPanel.tsx`.
2. **[P1] A broken shared link looks like a first visit.** A missing session or lookup error routes to the same creation screen as a new visit. Someone following the group URL may create a separate session instead of learning that the link failed. Show a specific “Couldn’t open this session” state with a recovery action. **Suggested command:** `$impeccable harden`. Evidence: `useSessionSetup.ts` routes both not-found and error paths to `setShowNewSession(true)`; the creation screen has no explanation.
3. **[P2] Mobile and assistive-technology controls need clearer targets and names.** Star buttons have compact hit areas; the presence checkbox and some icon-only actions lack explicit accessible labels; movie search results use clickable `<div>` elements instead of keyboard controls. Increase touch targets, name icon controls, and make result choices keyboard-operable. **Suggested command:** `$impeccable audit`. Evidence: `StarRating.tsx`, `PersonCard.tsx`.
4. **[P2] The empty Results state omits eligibility rules.** “Make sure people have rated the movies!” does not say that the proposer must be present and a present non-proposer must vote. A group can rate a film and still see no result. Explain the requirements or identify which one is unmet. **Suggested command:** `$impeccable clarify`. Evidence: `ResultsPanel.tsx` empty state and the repository’s ranking rules.

### Cognitive load

**Moderate: 2 checklist failures.** Five choices are visible in each star rating control. Movie search can return more than four selectable results at once. Identity is selected in the session menu, while Quick voting is elsewhere and refers users back to that menu; the selected identity is not prominent in the voting view. The entry screen itself is low-load: one field and one primary action. Session navigation shows three labeled choices, with two more destinations and identity selection grouped in the menu.

### Emotional journey

Starting a session is quick, but the entry screen gives little sense of the group movie-night experience ahead. Ranked results—the shared decision moment—use a standard list with little celebration. “Cannot be undone” makes the watched transition feel cautious, and the “Moved to Watched” confirmation lasts only 15 seconds, so it may be missed.

### Persona red flags

- **Casey, distracted mobile user:** Compact star controls and identity hidden in the top-right menu make one-handed voting harder. An interruption may also cause them to miss the temporary move confirmation.
- **Sam, accessibility-dependent user:** Star buttons have names, but presence and some icon-only actions do not. Clickable search-result `<div>` elements are not keyboard-operable.
- **Alex, impatient power user:** Quick voting is a useful shortcut, but still handles one film at a time; there is no batch rating path.

### Minor observations

- Session-name and add-person inputs rely on placeholders instead of visible labels.
- Watched Movies and Stats are in the menu, while People, Rate Movies, and Results have persistent navigation.
- Collapsed movie cards keep lists manageable, though Quick voting and the full Rate view may feel like overlapping modes.

### Questions to consider

- Could participant selection become a clear first setup step, so everyone knows whose ratings they are entering?
- What should someone see when a shared link is invalid or unavailable?
- Can the ranking feel more like a group decision moment than a generic results list?
