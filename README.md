# Shngm - Indonesian Comics Website

A modern, responsive web application for reading Indonesian comics (komik) and manhwa. Built with Vue 3, featuring real-time update timestamps, library management, multi-source content integration, and an Instagram-style comment system.

## Features

- **Real-time Timestamps**: Displays accurate update times for comics using chapter release dates
- **Multi-source Integration**: Fetches content from Shinigami API and Manhwadesu
- **Library Management**: Save your reading progress and track your library
- **Reading History**: Auto-saves page position per chapter, continue from where you left off
- **Instagram-Style Comments**: Modern comment system with rich media support
  - Rich media uploads (images, videos, GIFs)
  - Spoiler system with blur overlay and tap-to-reveal
  - Rich editor with emoji picker and media toolbar
  - Like, reply, and threaded comments
  - Username system with uniqueness validation
  - Profanity filter and moderation features
  - Infinite scroll for performance
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Fast Navigation**: Keep-alive caching for instant page transitions
- **Smart Caching**: 24-hour localStorage cache for instant loading
- **Search & Filter**: Advanced search with genre and format filters
- **Reading Progress**: Track your reading progress with visual indicators

## Tech Stack

- **Frontend**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **Styling**: Custom CSS with CSS variables
- **Icons**: Lucide Vue Next
- **API Integration**: Shinigami API, Manhwadesu API

## Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
shnm/
├── src/
│   ├── components/       # Reusable Vue components
│   ├── views/           # Page components
│   ├── composables/     # Vue composition functions
│   ├── api.js           # API service layer
│   └── main.js          # App entry point
├── api/                 # Vercel API routes
├── public/              # Static assets
└── lib/                 # Utility libraries
```

## Features in Detail

### Real-time Timestamps
- Fetches actual chapter release dates from the API
- Displays relative time (e.g., "5h", "2d", "Just now")
- Caches timestamps for 24 hours to reduce API calls
- Background fetching for non-blocking page loads

### Page Preservation
- Uses Vue's `<keep-alive>` to preserve page state
- Navigate between pages without reloading
- Timestamps persist when switching views

### Cover Image Handling
- Automatic fallback to placeholder for missing covers
- Support for multiple image sources
- CDN integration for fast loading

## API Rate Limiting

The application implements smart rate limiting to avoid API errors:
- 300ms delay between chapter list requests
- Retry mechanism with exponential backoff
- Caching to minimize API calls

## Deployment

This project is configured for Vercel deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

## License

This project is for educational purposes.

## Credits

- Content from Shinigami API
- Content from Manhwadesu
- Built with Vue 3 and Vite
