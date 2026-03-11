# 🚀 Next.js + shadcn/ui Starter Template

A modern, production-ready starter powered by **Next.js (App Router)**, **shadcn/ui**, **Tailwind CSS**, and **next-themes** for dark/light mode.  
Designed to be a clean foundation for any new project—SaaS, dashboards, landing pages, internal tools, and more.

---

## ✨ Features

- ⚡ **Next.js App Router** (latest version)
- 🎨 **Tailwind CSS** with automatic class merging
- 🧩 **shadcn/ui** — all components pre-installed & configured
- 🌓 **Dark / Light / System theme** using `next-themes`
- 🔤 **TypeScript-first** project with strict mode
- 📁 Well-organized, scalable folder structure
- 🛠️ ESLint + Prettier already set up (if using default Next.js config)

---

## 📦 What's Included

### UI / Styling
- Tailwind CSS
- shadcn/ui components
- Preconfigured `ThemeProvider`
- Optional Theme toggle component included

### Utility
- `clsx` + `tailwind-merge` via shadcn’s `cn()` helper
- `next-themes`

### Structure

```text
app/
  layout.tsx
  page.tsx
  globals.css
components/
  ui/               # shadcn components
  theme-toggle.tsx  # (optional)
lib/
  utils.ts          # cn() helper (class merging)
```

---

## 🛠️ Getting Started

### 1. Install dependencies

```bash
npm install
# or
yarn
# or
pnpm install
```

### 2. Run the dev server

```bash
npm run dev
```

App runs at:  
👉 http://localhost:3000

---

## 🎨 Theming (next-themes)

This template includes a working setup of next-themes integrated with shadcn/ui.

**ThemeProvider is placed in `app/layout.tsx`:**

```tsx
// app/layout.tsx
import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

**Tailwind config includes `darkMode: "class"`:**

```js
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  // ...
}
```

**Optional: Theme toggle button**

```tsx
import { ThemeToggle } from "@/components/theme-toggle"

<ThemeToggle />
```

---

## 📁 Project Structure

```text
.
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── ui/                # shadcn components
│   └── theme-toggle.tsx
├── lib/
│   └── utils.ts           # cn() helper
├── public/
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 🧑‍💻 Development Tips

**Add new shadcn components**

```bash
npx shadcn@latest add button
```

**Update shadcn components**

```bash
npx shadcn@latest update
```

**Check TypeScript issues**

```bash
npm run build
```

---

## 🚀 Deploying

This template works perfectly on:

- Vercel (recommended)
- Netlify
- Docker
- Any Node.js environment

**Vercel detects everything automatically—no configuration needed.**

---

## 📚 Recommended Add-Ons (Optional)

If you want to extend this template later:

**Forms & Validation**
- `react-hook-form`
- `zod`
- `@hookform/resolvers`

**Data Fetching**
- `@tanstack/react-query`

**Auth**
- `next-auth` (Auth.js)

**Dev Tools**
- `husky` + `lint-staged`
- `vitest` for unit testing

---

## 📝 License

MIT — feel free to use this template for personal or commercial projects.