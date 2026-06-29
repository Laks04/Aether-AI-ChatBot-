# Aether AI ChatBot

A sleek, modern, high-contrast workspace crafted in **React 19**, **Vite**, and **Express**, with beautiful fluid animations powered by **motion** (Framer Motion) and styled with the precision of **Tailwind CSS v4**. 

Aether serves as a powerful local assistant for writing, coding, brainstorming, and translation, featuring custom interactive tooling designed to elevate your productivity.

---

## 🎨 Design Philosophy & Features

Aether is designed with a striking **Cosmic Slate Theme** (deep slate blues, rich dark grays, and vivid pink/purple gradients) utilizing balanced negative space, responsive mobile-first views, and subtle micro-interactions to deliver a premium user experience.

### Key Capabilities

*   **⚡ Multiple Aether Core Models**: Configured to access highly optimized LLM backends tailored for different tasks:
    *   **Aether Large (Recommended)**: Best for complex reasoning and advanced debugging.
    *   **Aether MoE**: Highly responsive, balanced model for conversational tasks.
    *   **Aether Lite**: Fast and nimble for short questions.
    *   **Aether Legacy Models**: Backup architectures for standard queries.
*   **📚 Interactive Prompt Cards & Category Explorer**: Quick-start templates spanning multiple disciplines (Coding, Business/Copy, Creative Writing, Tutor/Coaching). Choose to **Draft** directly into your compose window for editing, or **Send** immediately.
*   **🔍 Real-Time Message Search**: Filter messages inside active conversations instantly with a lightweight, responsive in-chat filtering engine.
*   **🔊 Listen Aloud (Speech Synthesis)**: Integrated narration engine with markdown sanitization. Listen to answers read aloud dynamically with toggle, pulse animations, and automatic speech cancel/reset on unmount.
*   **📊 Conversation Analytics**: Deep visual insights panel tracking total messages, precise word and character counts, estimated reading times based on human-average speed (WPM), and average AI response lengths.
*   **💾 Multi-Format File Export**: Instantly export active conversation transcripts as beautifully formatted **Markdown (.md)** files or raw **JSON (.json)** for offline backups and records.
*   **📁 Persistent Storage**: Automatic client-side synchronization via `localStorage` keeps your chat history intact across browser sessions.

---

## 🛠️ Stack & Dependencies

*   **Frontend**: React 19, Vite 6, Tailwind CSS v4, Motion (Framer Motion)
*   **Backend**: Node.js Express Server, tsx, esbuild
*   **Icons**: Lucide React
*   **Rendering**: React Markdown (v10) for pristine syntax highlighting and text layouts

---

## 🚀 Getting Started

### Prerequisites

*   Node.js (v18 or higher recommended)
*   npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repository-url>
   cd aether-workspace
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables. Copy the `.env.example` file and configure your API keys:
   ```bash
   cp .env.example .env
   ```
   Configure the keys in `.env`:
   ```env
   GROQ_API_KEY="your_groq_api_key_here"
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

### Running the Application

*   **Development Mode**: Bootstraps the full-stack system with hot server reloading via `tsx`:
    ```bash
    npm run dev
    ```
    The server will boot up and serve the application on [http://localhost:3000](http://localhost:3000).

*   **Production Build**: Compiles frontend assets into `dist/` and bundles the Express server using `esbuild` into a CJS-safe, self-contained standalone server (`dist/server.cjs`):
    ```bash
    npm run build
    ```

*   **Production Start**: Launches the compiled bundle:
    ```bash
    npm run start
    ```

*   **Linter check**:
    ```bash
    npm run lint
    ```

---

## 📂 Project Architecture

```txt
├── server.ts             # Express server and backend API proxying for security
├── index.html            # Primary single-page entry point
├── package.json          # Dependency definitions and build pipeline scripts
├── tsconfig.json         # TypeScript configuration
├── src/
│   ├── main.tsx          # React application bootstrapping entry point
│   ├── App.tsx           # Primary application logic, state managers, and core view
│   ├── types.ts          # Strongly-typed interface and object descriptions
│   ├── presets.ts        # Modular configuration presets for AI Personas
│   ├── index.css         # Tailwind v4 directives and theme variables
│   └── components/
│       ├── Sidebar.tsx   # Panel containing chat lists, insights, settings, & exports
│       └── MessageItem.tsx # Chat bubble with copy, speech synthesis, and formatting
```

---

## 🔒 Security

All API keys are secured server-side. The client application never exposes secret credentials or API headers directly to the browser. Communication with AI backends is proxied securely through server routes in `server.ts`.
