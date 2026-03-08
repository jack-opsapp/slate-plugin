---
name: slate-tracking
description: "Conventions for using Slate as a task tracker with Claude Code. Use when managing todos, bugs, plans, or testing checkpoints in Slate."
---

# Slate Task Tracking Conventions

## Terminology & Voice

"Slate" is both the name of the app and a noun — a surface on which items are arranged, like a slate of tasks.

**Correct phrasing:**
- "Here's what's on the slate for OPS" or "Here's what's on your OPS slate"
- "You've got 12 items on the slate"
- "Adding that to the slate"
- "3 items left on the slate"
- "Let me check what's on the slate"
- "Clearing that off the slate"

**Avoid:**
- "slate board" — Slate is not a board. It's a slate.
- "Slate workspace" or "Slate project" — say "the slate for OPS" or "your OPS slate"

"Slate app" is fine when referring to the software itself. The key principle is that Slate is a surface things go *on* — so the natural phrasing is "on the slate for [page]."

Items can be called "notes", "tasks", "todos", or "items" depending on context — use whatever feels natural. Pages and sections are just "pages" and "sections."

## Critical Rules

1. **Create/update Slate notes BEFORE responding to the user.** Never tell the user what you did and then update Slate — update Slate first, then summarize.
2. **Always scope to the page_id from .claude/slate.local.md.** Never fetch all pages unless the user explicitly asks.
3. **Default to incomplete notes only.** Only fetch completed notes if the user asks for them.

## Tag Rules

**Before creating any tag, call `slate_list_tags` to check what already exists.** Reuse existing tags rather than creating near-duplicates. If an existing tag covers the same concept (e.g., `HIGH` already exists), use it — don't create `HIGH-PRIORITY`.

### Built-in Tags

| Tag | Meaning |
|-----|---------|
| BUG | Bug report captured by user |
| PLAN | Implementation plan step |
| NEEDS-TESTING | Testing checkpoint — user must verify |
| IN-PROGRESS | Currently being worked on |
| BLOCKED | Cannot proceed — content describes why |
| URGENT | Time-sensitive, prioritize |
| TODAY | Should be done today |
| THIS-WEEK | Should be done this week |

### Naming Conventions for Custom Tags

When the user asks to categorize or organize notes and no relevant tags exist yet, follow these patterns:

| Category | Convention | Examples |
|----------|-----------|----------|
| Priority | P1, P2, P3 | P1 = critical, P2 = important, P3 = nice-to-have |
| Difficulty / Level | L1, L2, L3 | L1 = easy, L2 = moderate, L3 = complex |
| Size / Effort | S, M, L, XL | T-shirt sizing |
| Phase | PHASE-1, PHASE-2 | Sequential project phases |
| Category prefix | CAT-[NAME] | CAT-UI, CAT-API, CAT-DATA |

**General rules:**
- **UPPERCASE, hyphen-separated** — all tags follow this format (e.g., `NEEDS-TESTING`, not `needs_testing`)
- **Short and scannable** — prefer abbreviations over full words when unambiguous (P1 over PRIORITY-HIGH)
- **No redundancy** — don't create both `URGENT` and `P1`. Pick one system per concept.
- **Check first, create second** — always `slate_list_tags` before introducing new tags. If the user's intent maps to an existing tag, use it.

## Note Enumeration

All list and sync responses include a `#` field (1, 2, 3...) for easy reference. When presenting notes to the user, always show the number prefix so items can be referenced by number (e.g. "mark #3 done", "what's the status of #7").

## When to Create Sections vs Tagged Notes

- **Small fixes (1-3 items):** Add tagged notes to an existing section (e.g. "Bugs", "Tasks")
- **Larger features (4+ items):** Create a dedicated section named after the feature
- **Testing checklists:** Always create a dedicated section named "[Feature] - Testing"

## Testing Checkpoint Format

When creating testing checkpoints after implementing a feature:
- **Content:** Describe what to test and the expected behavior in one clear sentence
- **Tags:** Always include NEEDS-TESTING
- **Example:** "Login with Google redirects to dashboard within 2 seconds" tagged NEEDS-TESTING

## Connecting Notes

Use connections to link related notes across sections or pages:

- **`slate_create_connection`** — Link two notes with a typed relationship
- **Connection types:** `related` (default), `supports`, `contradicts`, `extends`, `source`
- **When to connect:**
  - A bug note relates to a feature plan note → `related`
  - A testing checkpoint validates a plan step → `supports`
  - New research contradicts an existing assumption → `contradicts`
  - A follow-up task builds on a completed item → `extends`
  - A note references an external source or another note as origin → `source`

### Shared Notes Pattern

To share context across sections or pages, create a note in one location and connect it to relevant notes elsewhere. This avoids duplicating content:

1. Create the canonical note in the most relevant section
2. Use `slate_create_connection` with type `related` or `extends` to link it to notes in other sections/pages
3. When listing connections for a note (`slate_get_connections`), you can see all linked items

## Session Workflow

1. **Session start:** Confirm the page from .claude/slate.local.md with the user. Sync incomplete notes. Present numbered summary. Prioritize: URGENT > TODAY > BUG > THIS-WEEK > others.
2. **During work:** Tag active items IN-PROGRESS. Connect related items as you discover relationships.
3. **After completing work:** FIRST update Slate (mark done, create testing notes, connect related items), THEN respond to the user.
4. **When blocked:** Tag the item BLOCKED and update content with the reason.

## Project Config

Each project links to a Slate page via .claude/slate.local.md:

```
---
page_id: "uuid-of-the-slate-page"
page_name: "Project Name"
---
```

To set up: Call slate_list_pages to find the right page, then create this file.
