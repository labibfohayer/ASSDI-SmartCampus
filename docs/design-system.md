# Madrasat-us-Sunnah Reference Design System & Component Guidelines

Source Reference: `https://madrasatussunnah.org/`  
Target Application: ASSDI Student Learning Progress, Feedback & Management System

---

## 1. Typography Hierarchy & Rules

### Font Families
- **Primary Headings & Body (Bangla):** `'Noto Serif Bengali', serif` (or fallback `'Hind Siliguri', sans-serif`)
  - *Loaded on reference site:* `<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@100..900&display=swap" rel="stylesheet" />`
  - *Body fallback:* `'Tiro Bangla', sans-serif`, `'Hind Siliguri', sans-serif`
- **English / Numerals / Accents:** `'Hind Siliguri'`, `'Noto Serif Bengali'`, system-ui, sans-serif
- **Arabic Inscriptions / Hadith / Quran:** `'Amiri'`, `'Noto Naskh Arabic'`, serif

### Bangla Typography Rules (Strict Requirements)
1. **Body Font Size:** Base `16px` (`1rem`). Dense table cells or small meta tags may use `14px` (`0.875rem`). Never use `< 12px`.
2. **Line Height:** Body line-height must be at least `1.7` (e.g. `1.75` - `1.95`), exactly matching `.hm-about__text p { line-height: 1.95; }` and `.fee-note { line-height: 1.75; }` to prevent Bangla Matra and Hasanta clipping.
3. **No Letter Spacing on Bangla:** `letter-spacing: normal` (never use `tracking-widest` or letter-spacing on Bangla text).
4. **No Uppercase Transformations on Bangla:** Never apply `uppercase` to Bangla script.
5. **Font Weights:** `400` (Regular), `600` (SemiBold), `700` (Bold), `800` (ExtraBold).

### Typographic Scale
- **Display / Hero H1:** `clamp(1.55rem, 4.8vw, 2.6rem)` | Line-height `1.25` | Weight `800` | Color `#0f766e`
- **Section Heading H2 (`.hm-h2`):** `clamp(1.5rem, 3.4vw, 2.1rem)` | Line-height `1.3` | Weight `800` | Color `#0f766e`
- **Card Title H3 / H4:** `1.2rem` - `1.3rem` | Line-height `1.4` - `1.5` | Weight `800` | Color `#0f172a`
- **Subheadings (`.hm-sub`):** `1rem` | Line-height `1.8` | Color `#475569`
- **Body Regular:** `1rem` (`16px`) | Line-height `1.75` - `1.9` | Color `#334155`
- **Metadata / Timestamps:** `0.85rem` - `0.9rem` | Line-height `1.5` | Color `#94a3b8`

---

## 2. Spacing Rhythm & Layout Scale

- **Base Unit:** 4px / 8px geometric grid
- **Section Vertical Padding:** `48px` to `64px` on desktop (`.hm-section { padding: 64px 0; }`), `32px` to `48px` on mobile.
- **Card Padding:** `22px` to `26px` on desktop, `16px` on mobile (`.fee-card { padding: 22px; }`, `.hm-branch__card { padding: 26px; }`).
- **Card Gap:** `16px` to `24px` grid gap (`.fee-grid { gap: 22px; }`).
- **Container Max-Width:**
  - Content / Forms / Single Column: `1080px` - `1120px` (`.hm-container { max-width: 1120px; }`)
  - Admin & Analytical Tables: `1280px` - `1440px` with fluid responsive horizontal scroll.

---

## 3. Border Radii & Border Hierarchy

- **Cards & Modal Containers:** `16px` (`1rem`) (`.hm-card`, `.fee-card`, `.hm-branch__card { border-radius: 16px; }`)
- **Action Buttons & Form Inputs:** `12px` (`.hm-btn`, `.hm-form__submit { border-radius: 12px; }`, `.hm-form input { border-radius: 11px; }`)
- **Pill Badges & Circular Avatars:** `9999px` (`.hm-eyebrow`, `.fee-tick { border-radius: 999px; }`)
- **Standard Border:** `1px solid #e2e8f0` (`var(--hm-line)`)
- **Section Divider / Top Card Accent:** `3px` or `4px` top border in `#0d9488` (`var(--hm-teal-2)`)

---

## 4. Shadow System

- **Subtle Surface Shadow (Standard Cards):**  
  `0 18px 45px -34px rgba(15, 23, 42, 0.55)` (soft, diffused, non-muddy elevation)
- **Primary Button Lift Shadow:**  
  `0 16px 32px -20px rgba(15, 118, 110, 1.0)`
- **Header Navigation Shadow:**  
  `0 1px 3px 0 rgba(0, 0, 0, 0.05)`
- **Focus Ring:**  
  `box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.15); border-color: #14b8a6;`

---

## 5. Component Construction Rules

### 1. App Shell (Header & Sidebar)
- **Top Announcement Bar:** Deep Teal `#0f766e` with white text and gold/subtle badge.
- **Main Nav Header:** Pure white `#ffffff` with subtle bottom border `#e2e8f0` and minimal elevation `shadow-xs`.
- **Sidebar (Dashboard Shell):** Deep Islamic Forest Teal / Slate Dark (`#0B2A21` or `#0b1a2b` footer navy) with `#0f766e` active tabs, gold indicator bar on active item, and crisp text contrast.

### 2. Primary & Secondary Buttons
- **Primary Action Button:**
  - Background: `#0f766e`
  - Color: `#ffffff`
  - Padding: `12px 24px`
  - Border-Radius: `12px`
  - Font-Weight: `700`
  - Hover: `background: #115e59; transform: translateY(-1px);`
  - Shadow: `0 16px 32px -20px rgba(15, 118, 110, 1)`
- **Secondary Outline Button:**
  - Background: `#ffffff`
  - Border: `1.5px solid #e2e8f0`
  - Color: `#0f172a`
  - Hover: `background: #f8fafc; border-color: #99f6e4; color: #0f766e;`

### 3. Data Tables (Based on `.fee-table` from reference site)
- Background for headers / highlighted rows: Soft Teal `#f0fdfa`
- Border: `1px solid #ccfbf1` (`--fee-teal-line`)
- Left accent indicator on primary column: `4px solid #14b8a6` (`--fee-teal-3`)
- Spacing: Clean padding `12px 16px`, no harsh grey grids.

### 4. Stat Cards
- Background: `#ffffff` with `border: 1px solid #e2e8f0` and `border-radius: 16px`
- Number Display: `clamp(1.5rem, 3vw, 2rem)` in `#0f172a` or `#0f766e`
- Icon Badge: `42px x 42px` with `border-radius: 12px`, gradient `#0f766e` to `#0d9488`, white icon.

### 5. Islamic Dignity & Anti "AI Look" Invariants
- NO purple/violet/magenta gradients.
- NO floating blobs, mesh overlays, or sparkling star decorations.
- NO emojis as icons; use Lucide React with `stroke-width={2}` consistently.
- NO oversized roundings (>24px except pill badges); cards use 16px, buttons 12px.
- Subtle transitions: `150ms` - `200ms` only.
- Strict WCAG AA contrast (4.5:1 minimum for normal text, 3:1 for large headings and UI controls).
