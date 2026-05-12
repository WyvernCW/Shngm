# VRTWEL COMICS - Premium Brutalist Manga Reader

![VRTWEL COMICS Logo](/assets/logo.png)

A high-performance, visually striking web application for reading manga and manhwa. Built with a "Brutalist Comic" aesthetic, featuring real-time "FRESH" chapter badges, advanced API throttling, and a premium dark-mode experience.

## ⚡ Key Features

- **Brutalist Comic Aesthetic**: A unique, high-craft design system featuring sharp borders, heavy box shadows, halftone dot patterns, and vibrant comic-inspired accents.
- **Real-Time "FRESH" Badges**: Real-time identification of new chapters. Chapters released within the last 5 hours are marked with a dynamic "FRESH" badge.
- **API Stability Layer**: Robust request queue and caching system to handle high-frequency data fetching while strictly adhering to backend rate limits (prevents 429 errors).
- **Infinite Library Management**: Save your favorite series, track reading progress, and maintain a personal "Stash" with local persistence.
- **Instagram-Style Comments**: A modern, rich-media comment system supporting images, GIFs, spoiler tags, and nested replies.
- **Zero-Flicker UI**: Implemented `v-cloak` and optimized CSS variables to eliminate Flash of Unstyled Content (FOUC).
- **Responsive Mastery**: Tailored experiences for Desktop (sticky sidebar navigation) and Mobile (bottom navigation rail).

## 🛠 Tech Stack

- **Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **Styling**: Vanilla CSS with a custom-built Design System
- **Icons**: Lucide Vue Next
- **API Architecture**: Queue-based service layer with in-memory caching (1-hour TTL)

## 🚀 Getting Started

### Project Structure

```
Shngm/
├── src/
│   ├── components/       # Optimized reusable UI components
│   ├── views/           # Main view pages (Home, Trending, Library, etc.)
│   ├── api.js           # Centralized API service with request queue
│   └── style.css        # Global Brutalist Design System
├── public/              # Static assets and icons
└── api/                 # Serverless API routes
```

## 💎 Design Philosophy

VRTWEL COMICS moves away from generic "clean" UI in favor of a **Brutalist Manga** style:
- **High Contrast**: Pure deep grays (`#09090b`) paired with sharp dividers (`#27272a`).
- **Tactile Feedback**: Heavy 4px - 8px offsets for shadows and borders to make every card feel like a physical comic panel.
- **Halftone Patterns**: Subtle background textures inspired by traditional manga printing.

## 🛡 Performance & Stability

The application is engineered for reliability:
- **Request Throttling**: Automatically spaces out API calls to prevent IP blocks.
- **Optimized Rendering**: Minimized layout shifts and removed complex KeepAlive logic in favor of stable, reactive state management.
- **FOUC Prevention**: Global CSS guards ensure the theme is applied instantly upon load.

## 📜 License

This project is for educational and personal use only.

## 🙌 Credits

- **Logo**: Custom generated with Nano Banana
- **Content**: Integrated from multiple high-quality manga/manhwa providers
- **Development**: Built with Vue 3 & Vite
