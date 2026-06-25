# FileZone — Deployment Guide

## Architecture

| Part     | Technology             | Host   |
|----------|------------------------|--------|
| Frontend | React + Vite (SPA)     | Vercel |
| Backend  | Express.js + TypeScript| Render |
| Database | PostgreSQL              | Render (built-in) |

---

## 1. Deploy Backend on Render

### Step-by-step

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repository
3. Set the **Root Directory** to `artifacts/api-server`
4. Configure the service:
   - **Name:** `filezone-api`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** Free (or Starter for production)

### Environment Variables (set in Render dashboard)

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | (auto-set by Render if you add a PostgreSQL database) |
| `PORT` | `10000` |
| `FRONTEND_URL` | `https://your-vercel-app.vercel.app` |

### Add PostgreSQL on Render

1. In Render dashboard → **New** → **PostgreSQL**
2. Name it `filezone-db`
3. Copy the **Internal Database URL**
4. Add it as `DATABASE_URL` in your Web Service's environment variables

### Your Backend URL
After deploy: `https://zone-organizerzip1.onrender.com`

---

## 2. Deploy Frontend on Vercel

### Step-by-step

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repository
3. Set the **Root Directory** to `artifacts/filezone`
4. Configure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist/public`
   - **Install Command:** `npm install`

### Environment Variables (set in Vercel dashboard)

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://zone-organizerzip1.onrender.com/api` |
| `BASE_PATH` | `/` |
| `PORT` | `3000` |

### Custom Domain (optional)
In Vercel → Project Settings → Domains → add `filezone.app`

---

## 3. Update API URL in Frontend

In `artifacts/filezone/src/pages/AdminPage.tsx`, the API constant is:
```ts
const API = "/api";
```

For production with separate domains, update it to:
```ts
const API = import.meta.env.VITE_API_URL ?? "/api";
```

And update `vite.config.ts` to proxy API calls during development:
```ts
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

---

## 4. Google AdSense Setup

To monetize with AdSense:

1. Apply at [google.com/adsense](https://adsense.google.com)
2. Once approved, get your **Publisher ID** (looks like `ca-pub-XXXXXXXXXXXXXXXX`)
3. Replace the placeholder in `artifacts/filezone/index.html`:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-YOUR-ID-HERE" crossorigin="anonymous"></script>
   ```
4. Add ad units on your pages where appropriate

### AdSense Eligibility Checklist
- ✅ Original content (tool descriptions, about page, privacy policy, terms)
- ✅ Privacy Policy page at `/privacy`
- ✅ Terms of Service page at `/terms`
- ✅ Contact Us page at `/contact`
- ✅ Robots.txt and Sitemap
- ✅ No pop-ups or intrusive ads
- ✅ Mobile-responsive design
- ✅ Fast page load (browser-based processing)

---

## 5. SEO Checklist

After deploying:

1. **Submit sitemap** to Google Search Console:
   - Go to [search.google.com/search-console](https://search.google.com/search-console)
   - Add your property (e.g., `filezone.app`)
   - Submit: `https://filezone.app/sitemap.xml`

2. **Verify your site** with Google Search Console (add meta tag to `index.html`)

3. **Set up Google Analytics** (optional):
   - Get GA4 measurement ID
   - Add to Admin panel → Site Settings → Analytics Code

4. **Get backlinks** — submit to:
   - Product Hunt
   - Hacker News Show HN
   - Reddit (r/webdev, r/tools)
   - AlternativeTo.net

---

## 6. Backend Details (for Render)

Your backend does:
- **`GET /api/tools`** — list all public tools
- **`GET /api/tools/stats`** — files processed count, tool count
- **`GET /api/tools/categories`** — category list with counts
- **`POST /api/tools/:slug/track`** — track tool usage (called after each file processed)
- **`POST /api/admin/login`** — admin authentication
- **`GET /api/admin/tools`** — all tools including hidden (admin only)
- **`PUT /api/admin/tools/:slug`** — update tool (admin only)
- **`POST /api/admin/tools`** — create tool (admin only)
- **`DELETE /api/admin/tools/:slug`** — delete tool (admin only)
- **`GET /api/admin/settings`** — site settings (admin only)
- **`PUT /api/admin/settings`** — update settings (admin only)
- **`GET /api/admin/stats`** — real stats: visitors, files processed (admin only)
- **`POST /api/visit`** — increment visitor counter
- **`GET /api/sitemap.xml`** — XML sitemap for all pages + tools
- **`GET /api/robots.txt`** — robots.txt

### Default Admin Password
`admin123` — **change this immediately after first login** via Admin → Site Settings.
