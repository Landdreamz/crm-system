# Sidebar icon style options

Choose one style for the icons next to tab names in the left sidebar.

---

## Option 1: **Outlined**
- **Look:** Line-only icons, no fill. Lighter and cleaner (like Gmail, Notion, Linear).
- **How:** All icons use MUI’s “Outlined” variants (e.g. `PeopleOutlined`, `MapOutlined`).
- **Vibe:** Modern, minimal, professional.

---

## Option 2: **Rounded**
- **Look:** Same general shapes as now, but with softer, rounded corners.
- **How:** All icons use MUI’s “Rounded” variants.
- **Vibe:** Friendly, approachable, still clean.

---

## Option 3: **Pill / container**
- **Look:** Each icon sits in a small rounded rectangle (pill) with a light background. Selected item: pill uses the green gradient.
- **How:** Keep current icons; wrap `ListItemIcon` in a box with `borderRadius: 2`, padding, and `bgcolor: 'action.hover'` (selected: gradient).
- **Vibe:** App-launcher / widget style, very clear selected state.

---

## Option 4: **Accent line**
- **Look:** Icons stay as they are; selected item gets a bold left border (or thin vertical bar) in primary green instead of a full background.
- **How:** No icon change; add a left border (e.g. 3px solid primary) on the selected `ListItemButton` and optionally lighten the full-row background.
- **Vibe:** Subtle, dashboard-style, less “heavy” than full gradient.

---

**To apply:** Tell me which option you want (e.g. “Option 2” or “use the pill style”) and I’ll switch the sidebar to that style.
