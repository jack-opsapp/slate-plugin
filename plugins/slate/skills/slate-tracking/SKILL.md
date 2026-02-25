---
name: slate-tracking
description: "Conventions for using Slate as a task tracker with Claude Code. Use when managing todos, bugs, plans, or testing checkpoints in Slate."
---

# Slate Task Tracking Conventions

## Tag Vocabulary

Use these standard tags when creating or updating notes in Slate:

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

## When to Create Sections vs Tagged Notes

- **Small fixes (1-3 items):** Add tagged notes to an existing section (e.g. "Bugs", "Tasks")
- **Larger features (4+ items):** Create a dedicated section named after the feature
- **Testing checklists:** Always create a dedicated section named "[Feature] - Testing"

## Testing Checkpoint Format

When creating testing checkpoints after implementing a feature:
- **Content:** Describe what to test and the expected behavior in one clear sentence
- **Tags:** Always include NEEDS-TESTING
- **Example:** "Login with Google redirects to dashboard within 2 seconds" tagged NEEDS-TESTING

## Session Workflow

1. **Session start:** Check Slate sync results for open items. Prioritize by tags: URGENT > TODAY > BUG > THIS-WEEK > others
2. **During work:** When starting on a Slate item, tag it IN-PROGRESS
3. **After completing work:** Mark the note completed=true. Create testing checkpoints if the work needs user verification.
4. **When blocked:** Tag the item BLOCKED and update content with the reason

## Project Config

Each project links to a Slate page via .claude/slate.local.md:

```
---
page_id: "uuid-of-the-slate-page"
page_name: "Project Name"
---
```

To set up: Call slate_list_pages to find the right page, then create this file.
