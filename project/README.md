# LockIn - Project Management & Focused Work Platform

## 🚀 Project Overview

**LockIn** is a modern, full-stack collaborative project management application built with Next.js App Router. Developed as a comprehensive capstone project, LockIn combines robust task management with dedicated "focus sessions," allowing users to organize their work and eliminate distractions seamlessly.

### 📋 Key Features

- **Project & Task Management**: Create workspaces, projects, and lists to organize tasks. Add descriptions, labels, priorities, and due dates.
- **Interactive Kanban Boards**: Fluid drag-and-drop task management powered by `@dnd-kit`.
- **Deep Work "LockIn" Sessions**: A dedicated focus mode featuring a distraction-free overlay, session tracking, and built-in ambient audio (Focus Music and White Noise) to maximize productivity.
- **Real-Time Collaboration**: Live board updates, task assignments, and event synchronization via Pusher.
- **Team Collaboration**: @mentions, comments, project invitations, and team member management.
- **Comprehensive Notification System**: Robust in-app notification dropdown with granular user preferences (e.g., mute all, mute during focus, task assignment alerts).
- **Authentication & Security**: Secure user authentication and authorization using Clerk.

## 🛠 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime & Language**: React 19, TypeScript 5.9
- **Database & ORM**: PostgreSQL (Neon/Vercel) with Drizzle ORM
- **Authentication**: Clerk
- **Real-Time Sync**: Pusher
- **State Management**: Zustand
- **Styling & UI**: Tailwind CSS, Framer Motion, Radix UI, Lucide Icons
- **Drag & Drop**: @dnd-kit
- **Tooling**: pnpm, Biome (Linting & Formatting)

## 📁 Project Structure Overview

```
project/
├── app/                  # Next.js App Router (Pages, API routes, Server Actions)
├── components/           # Reusable UI components (Kanban, Modals, LockIn Overlay, etc.)
├── hooks/                # Custom React hooks (Task fetching, Real-time collaboration)
├── lib/                  # Utilities, Database configuration, Real-time events
├── stores/               # Zustand state management (Focus, Tasks, UI)
├── types/                # TypeScript type definitions
└── public/               # Static assets, including audio files for LockIn sessions
```

## 🚀 Getting Started

### Prerequisites
- **Node.js**: 20+ LTS
- **pnpm**: Latest version (`npm install -g pnpm`)
- **PostgreSQL Database**: You can use a local instance or a managed service like Neon or Vercel Postgres.

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nextjs-internship-capstone/project
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   Copy the example environment file and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```
   *Note: You will need valid Clerk, PostgreSQL, and Pusher credentials to run the application locally.*

4. **Initialize Database**
   Generate and apply the Drizzle schema migrations:
   ```bash
   pnpm run db:generate
   pnpm run db:migrate
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

6. **Open in browser**
   - Navigate to `http://localhost:3000`

### Available Scripts
- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm check` - Run Biome linter
- `pnpm format` - Run Biome formatter
- `pnpm db:generate` - Generate Drizzle schema
- `pnpm db:migrate` - Migrate Database

## 🎵 Audio Credits

Audio assets used in LockIn are sourced from Pixabay and used under the [Pixabay Content License](https://pixabay.com/service/license/).

* **Focus Music** — Music by [kaazoom](https://pixabay.com/users/kaazoom-448850/)
  * [Bourbon Street Echoes - Lo-Fi Full Version](https://pixabay.com/music/beats-bourbon-street-echoes-lo-fi-full-version-576204/)
  * [Velvet Espresso & Rainy Panes - Full Version](https://pixabay.com/music/beats-velvet-espresso-amp-rainy-panes-full-version-576190/)
  * [Rainy Window Study Lofi - Full Version](https://pixabay.com/music/beats-rainy-window-study-lofi-full-version-526105/)

* **Brown Noise** — Music by [Cosmic Scapes](https://pixabay.com/users/cosmic-scapes-48503009/)
  * [Relaxing Smoothed Brown Noise](https://pixabay.com/sound-effects/film-special-effects-relaxing-smoothed-brown-noise-294838/)
