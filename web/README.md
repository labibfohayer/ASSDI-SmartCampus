# ASSDI SmartCampus Web Dashboard

Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui

## 🌐 Live Cloud Deployment
- **Live URL:** [https://assdi-smartcampus.pages.dev](https://assdi-smartcampus.pages.dev)
- **Hosted on:** Cloudflare Pages
- **Connected Backend:** [https://assdi-backend-egu4.onrender.com](https://assdi-backend-egu4.onrender.com)

---

## 🚀 Getting Started Locally

### 1. Environment Configuration
Create `.env.local` to connect to your local Django backend:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8001
```

### 2. Install Dependencies & Run
```bash
npm install
npm run dev -- -p 3000
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🛠️ Build for Production
To build a static export for Cloudflare Pages:
```bash
npm run build
```
Output directory: `out/`
