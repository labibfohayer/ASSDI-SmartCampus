# Palette Refresh — Undo & Redo Guide

- **Original Branch (ORIGINAL_BRANCH):** `design-refresh`
- **Backup Tag:** `before-palette-refresh`
- **Commit Hash:** `681f888130fe5aa4d535a7dd39565dc4db9213d9`
- **Target Branch for Refresh Work:** `palette-refresh`

---

## How to Undo (পূর্বের অবস্থায় ফিরে যাওয়ার নিয়ম)
If you want to revert back to the exact previous design state:

```bash
# 1. Commit or stash any pending changes on palette-refresh:
git add -A && git commit -m "checkpoint: work on palette-refresh before undo"

# 2. Switch back to the original branch:
git checkout design-refresh

# 3. Restart dev server if needed:
cd web && npm run dev
```

## How to Redo (নতুন ডিজাইনে পুনরায় আসার নিয়ম)
If you want to return to the refreshed palette:

```bash
git checkout palette-refresh
cd web && npm run dev
```
