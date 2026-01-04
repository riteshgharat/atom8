# Atom8 Frontend

The frontend for ATOM8 is a high-performance, responsive React application built using **Next.js 15**. It provides a premium dashboard experience for managing data ingestion, monitoring AI pipelines, and downloading structured outputs.

## ✨ Features

- **Dynamic Landing Page**: Features high-fidelity animations with `AnimatedBeam` and `ShimmerButton`.
- **Live Pipeline Monitor**: Real-time progress tracking through WebSockets, visualizing extraction, merge, and validation stages.
- **Tri-Panel Layout**:
  - **Sources Panel**: Manage file uploads and URL ingestions.
  - **Process Monitor**: Real-time feed of AI system instructions and outputs.
  - **Outputs Panel**: One-click download for JSON, CSV, and AI-generated PDF Autopsy reports.
- **Glassmorphism Design**: Sophisticated UI using Tailwind CSS with dark mode support.
- **Zustand State Management**: Smooth, synchronized state across various panels.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)

## 🏁 Getting Started

### Installation

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root of the `frontend` folder:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build
   ```

## 📂 Project Structure

- `src/app`: Next.js pages and layouts (using App Router).
- `src/components`: Reusable UI components (Panel systems, animated elements).
- `src/store`: Zustand stores for job tracking and global state.
- `src/lib`: Utility functions and configuration.
- `public`: Static assets and icons.

---

## 🎨 Styling

We use **Vanilla CSS** modules alongside **Tailwind CSS** for maximum flexibility. Premium animations are handled by `framer-motion` and `tailwindcss-animate`.
