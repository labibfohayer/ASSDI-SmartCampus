# Design Tokens — Madrasat-us-Sunnah Reference Design System

Source Reference: `https://madrasatussunnah.org/`  
Extraction Date: 2026-11-22  
Methodology: Extracted directly from live CSS (`custom_style.css`, inline style blocks across `/`, `/notice`, `/syllabus`, `/fees`, `/all-teacher`) and official logo SVG (`madrasatus-sunnah-logo.svg`).

---

## 1. Primary & Brand Colors (ব্র্যান্ড ও প্রাথমিক রং)
*Refined per User Design Feedback (Madrasat-us-Sunnah balanced design system: top ambient sky light glow `#DCF4F1` cascading down, warm hero banner `#FFFBEB` with `#FCD34D` border, signature teal `#0F766E` for buttons and active states, soft sky `#F0FDFA` / `#CCFBF1` for cards and badges, and subtle institutional sidebar `#F8FAFC`):*

| Token Name | Hex / RGB Value | Role & Usage | Where Seen on Reference Site |
|---|---|---|---|
| `--color-brand-primary` | `#0f766e` (rgb 15 118 110) | Signature Teal Brand, Primary CTA Buttons, Active Highlights | Madrasat-us-Sunnah CTA Buttons & Action Accents |
| `--color-brand-primary-hover` | `#115e59` (rgb 17 94 89) | Primary Button Hover, Active Click State | Action Buttons Hover State |
| `--color-brand-teal-2` | `#0d9488` (rgb 13 148 136) | Secondary Accent Teal | Card Hover Accents |
| `--color-brand-teal-3` | `#14b8a6` (rgb 20 184 166) | Border Highlights, Focus Rings | Interactive Element Borders |
| `--color-brand-sky-glow-start` | `#dcf4f1` (rgb 220 244 241) | **Ambient Sky Light Glow:** Top gradient start behind main content | Reference Site Top Ambient Glow |
| `--color-brand-sky-glow-mid` | `#eaf8f5` (rgb 234 248 245) | **Ambient Sky Light Glow:** Mid-depth gradient transition | Reference Site Top Ambient Glow |
| `--color-brand-teal-soft` | `#f0fdfa` (rgb 240 253 250) | **Preserved:** Soft Sky Surface Tint, Pill Badge Backgrounds | Reference Table Header, Feature Cards Tint |
| `--color-brand-teal-line` | `#ccfbf1` (rgb 204 251 241) | **Preserved:** Soft Sky Border Line, Dividers | Reference Table Borders, Sky Badges |
| `--color-brand-warm-banner-bg` | `#fffbeb` (rgb 255 251 235) | Warm Ivory / Cream Hero Banner Background | Madrasatus Sunnah Admission Notice Banner |
| `--color-brand-warm-banner-border` | `#fcd34d` (rgb 252 211 77) | Warm Hero Banner Border Line | Madrasatus Sunnah Admission Notice Banner Border |
| `--color-brand-warm-banner-accent` | `#d97706` (rgb 217 119 6) | Warm Banner Thick Left Accent Border Stripe | Admission Banner Left Accent Stripe |
| `--color-brand-gold` | `#c1982e` | Islamic Gold / Ochre Accent (Institutional Badge & Seals) | `madrasatus-sunnah-logo.svg` (cls-2 text & decorative calligraphy) |
| `--color-brand-green-dome` | `#00a14a` | Emerald Green (Symbolic Islamic Element) | `madrasatus-sunnah-logo.svg` gradient stop-0 |
| `--color-brand-ocean-blue` | `#016c90` | Ocean Blue / Deep Accent | `madrasatus-sunnah-logo.svg` gradient stop-1 |
| `--color-brand-cyan-teal` | `#067a85` | Rich Cyan-Teal | `madrasatus-sunnah-logo.svg` cls-13 fill |

---

## 2. Neutral & Surface Colors (পৃষ্ঠতল ও টেক্সট রং)

| Token Name | Hex / RGB Value | Role & Usage | Where Seen on Reference Site |
|---|---|---|---|
| `--color-page-bg` | `#ffffff` | Primary Page & Card Background | `.hm-page`, `.hm-card`, `.fee-card`, main body |
| `--color-page-bg-tint` / `--hm-bg` | `#f8fafc` (rgb 248 250 252) | Alternate Section Tint Background, Subtle Surface | `.hm-section--tint`, `.hm-chair` background |
| `--color-surface-soft` / `--fee-bg` | `#f1f5f9` (rgb 241 245 249) | Fee Page Surface, Secondary Tab Container | `.fee-page` background, closed branch pill |
| `--color-text-ink` / `--hm-ink` | `#0f172a` (rgb 15 23 42) | Deep Dark Text, Card Titles, H3/H4, Strong Emphasis | `.hm-notices__title`, `.fee-title`, `.hm-why__title` |
| `--color-text-body` | `#334155` (rgb 51 65 85) | Main Body Text, Notes, Descriptive Paragraphs | `.hm-about__text p`, `.fee-note`, `.fee-row-label` |
| `--color-text-muted` / `--hm-muted` | `#475569` (rgb 71 85 105) | Subheadings, Metadata, Descriptive Captions | `.hm-sub`, `.hm-branch__addr`, `.fee-feature-note` |
| `--color-text-subtle` | `#94a3b8` (rgb 148 163 184) | Dates, Breadcrumbs, Timestamps, Inactive Labels | `.hm-notice__date`, `.hm-contact__card p + p` |
| `--color-border-line` / `--hm-line` | `#e2e8f0` (rgb 226 232 240) | Standard Card Borders, Dividers, Table Separators | `.hm-card`, `.hm-hero`, `.fee-card`, `.hm-form input` |

---

## 3. Footer Deep Navy Colors (ফুটার প্যালেট)

| Token Name | Hex / RGB Value | Role & Usage | Where Seen on Reference Site |
|---|---|---|---|
| `--color-footer-bg-start` | `#0b1a2b` | Dark Footer Gradient Start (Top) | `.site-footer` linear-gradient top |
| `--color-footer-bg-end` | `#0a1420` | Dark Footer Gradient End (Bottom) | `.site-footer` linear-gradient bottom |
| `--color-footer-panel` | `#122036` | Footer Card / Embed Container Background | `.ft-fb` background (`--ft-panel`) |
| `--color-footer-line` | `rgba(255, 255, 255, 0.10)` | Footer Divider & Outline Lines | `.ft-bottom`, `.ft-fb` border |
| `--color-footer-text` | `#a9b8c9` | Footer Body & Links Text | `.ft-about`, `.ft-links a`, `.ft-bottom p` |
| `--color-footer-heading` | `#ffffff` | Footer Section Headings | `.ft-title` (`--ft-head`) |
| `--color-footer-teal` | `#2dd4bf` (Teal 400) | Footer Hover Links, Contact Icons, Bottom Line Accent | `.ft-links a:hover`, `.ft-contact svg`, footer top border line |

---

## 4. Semantic Status & Badges (স্ট্যাটাস ও নোটিফিকেশন রং)

| Token Name | Hex Value | Role & Usage | Where Seen on Reference Site |
|---|---|---|---|
| `--color-success-bg` | `#f0fdf4` (Green 50) | Success Banner Background, Present Attendance | `.hm-admission` open background |
| `--color-success-border` | `#86efac` (Green 300) | Success Border | `.hm-admission` border |
| `--color-success-accent` | `#15803d` (Green 700) | Success Thick Left Border & Dot | `.hm-admission` left border |
| `--color-success-text` | `#166534` (Green 800) | Success Text / Open Status | `.hm-admission__title`, open branch badge |
| `--color-warning-bg` | `#fffbeb` (Amber 50) | Warning Banner Background, Late Attendance | `.hm-admission--closed` background |
| `--color-warning-border` | `#fcd34d` (Amber 300) | Warning Border | `.hm-admission--closed` border |
| `--color-warning-accent` | `#d97706` (Amber 600) | Warning Left Accent Border | `.hm-admission--closed` left border |
| `--color-warning-text` | `#92400e` (Amber 800) | Warning Text / Notice | `.hm-admission--closed` title |
| `--color-danger-bg` | `#fef2f2` (Red 50) | Error / Absent / Urgent Alert Background | `style block 0` `.bg-red-50` |
| `--color-danger-border` | `#f87171` (Red 400) | Danger Border | `style block 0` `.border-red-400` |
| `--color-danger-text` | `#991b1b` (Red 800) | Danger / Absent Text | `style block 0` `.text-red-800` |
| `--color-info-bg` | `#f0fdfa` (Teal 50) | Informational Surface, Neutral Alert | `.fee-teal-soft`, `.hm-notice:hover` |
| `--color-info-border` | `#ccfbf1` (Teal 100) | Informational Outline | `.fee-teal-line` |
| `--color-info-text` | `#0f766e` (Teal 700) | Informational Text | `.hm-eyebrow` |

---

## 5. Understanding Rating Scale 1–5 (ফিডব্যাক স্কেল রং)

*Harmonized with the Madrasat-us-Sunnah calm palette; always accompanied by visible numbers/icons per safety guidelines:*

| Level | Rating Number & Label | Background | Text Color | Border Color |
|---|---|---|---|---|
| 1 | ১ - একদম বুঝিনি (Poor) | `#fef2f2` | `#991b1b` | `#fca5a5` |
| 2 | ২ - সামান্য বুঝেছি (Fair) | `#fff7ed` | `#c2410c` | `#fed7aa` |
| 3 | ৩ - মোটামুটি বুঝেছি (Good) | `#fffbeb` | `#b45309` | `#fde68a` |
| 4 | ৪ - ভালো বুঝেছি (Very Good) | `#f0fdf4` | `#15803d` | `#86efac` |
| 5 | ৫ - সম্পূর্ণ স্পষ্ট (Excellent) | `#f0fdfa` | `#0f766e` | `#5eead4` |

---

## 6. Chart Palette (৫-রঙের চার্ট প্যালেট)

*Derived directly from the reference brand colors and logo gradients for Recharts visualizations:*

1. **Chart 1 (Primary Teal):** `#0f766e` (Teal 700 - Attendance, Main Metrics)
2. **Chart 2 (Teal Light):** `#14b8a6` (Teal 500 - Secondary Progress, Batch Comparisons)
3. **Chart 3 (Islamic Gold):** `#c1982e` (Ochre Gold - Exam Scores, Certificate Thresholds)
4. **Chart 4 (Emerald Green):** `#16a34a` (Green 600 - High Understanding, On-Track Batches)
5. **Chart 5 (Ocean Slate):** `#3b82f6` / `#016c90` (Ocean Blue - Theoretical & Practical Modules)
