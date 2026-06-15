# 🛠️ ToolMitra (Your Digital Companion)

[![React](https://img.shields.io/badge/React-19.0-blue?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Google Gemini API](https://img.shields.io/badge/Gemini_API-Supported-orange?logo=google&logoColor=white)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**ToolMitra** is a professional, lightning-fast, privacy-first web application featuring a robust suite of digital workspace tools. Crafted with React, Vite, Tailwind CSS v4, and TypeScript, ToolMitra is designed to solve daily document and image-processing tasks directly inside your browser window with absolute security and no server-side bottlenecks.

---

## 🌟 Core Philosophy

- **🔒 Client-First Privacy**: File processing (compressing, cropping, merging, converting) executes strictly client-side. Your personal files never leave your device.
- **⚡ Peak Performance**: Optimized build outputs, lightweight interactive components, and dynamic layouts ensure near-instantaneous page initialization.
- **☀️ Default Light Mode**: To maximize aesthetic clarity, comfort, and professional usability upon first boot, the website explicitly initializes in **Light Mode** for every new visitor. A twilight slate **Dark Mode** is available at the click of a button and is stored cleanly for returning users.
- **🎨 Elite Typography & Design**: Built on modern space-grotesk headings, inter UI typeface, and micro-interactions powered by `motion` React.

---

## 🛠️ The Comprehensive Utility Suite

ToolMitra bundles 16+ powerful digital tools structured cleanly across intuitive categories:

### 📄 1. Indian & Official Document Utilities
*   **Aadhaar Card Merger**: Merge separate images of the front and back of your Aadhaar card into a single print-ready PDF or layout pages seamlessly.
*   **Aadhaar Photo & Signature Matcher**: Autoscale Aadhaar face photos to standard crop guidelines.
*   **Passport Photo Maker**: Prepare standard custom passport photos with custom margins, background color replacement, and printable sheet templates.
*   **Signature Resizer**: Crop and compress official signatures down to exact dimensions (e.g., 200 x 80px) and target file sizes (e.g., under 20KB) required for government applications.

### 📑 2. Advanced PDF & Document Wizards
*   **PDF Split & Merge**: Reorder, delete pages, combine multiple records, or dissect standard PDF documents on-the-fly.
*   **Word-to-PDF Converter**: Instantly output clean PDF documents from `.docx` format structures.
*   **PDF-to-Word Converter**: Clean parsing structure to convert documentation.
*   **Document Compilers**: Fast conversion mechanisms with progress indicators.

### 🖼️ 3. Premium Image Processing Engine
*   **Smart Image Compressor**: Seamlessly adjust visual quality metrics to shrink sizes down to exact target limits (e.g., compress directly under 50KB, 100KB, or custom ranges).
*   **Custom Resizer & Format Converter**: Modify dimensions (Width & Height) dynamically while switching file formats amongst **JPEG, PNG, and WebP**.
*   **Precise Cropping Tool**: Custom aspect ratio canvas presets tailored for major social headers, profile images, and official document formats.
*   **MB ⇄ KB Size Converter**: Fast calculations to evaluate optimal file sizing restrictions against specified online portals.

### 🤖 4. Generative & Intelligent Utilities
*   **AI Resume Builder**: Input key coordinates and let Google Gemini AI assist in crafting standard-compliant, professional professional markdown resumes.
*   **AI Image Enhancer**: Get instant feedback, optimization metrics, and visual score rankings powered by Gemini API.
*   **Dynamic QR Code Generator**: Generate highly customizable thematic QR codes with flexible background gradients and margin patterns.
*   **Chronological Age Calculator**: Find the exact age, days passed, and milestone calendars for application form dates.

---

## 🚀 Getting Started

To run the repository locally, follow these simple setup steps:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v18 or higher is recommended) alongside NPM or Yarn.

### Setup & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/toolmitra.git
   cd toolmitra
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file at the root level to support AI features:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Launch development server:**
   ```bash
   npm run dev
   ```
   Open your browser to the URL printed in the terminal (usually `http://localhost:3000`).

---

## 🏗️ Production Compilation

To bundle and optimize ToolMitra for production (hosting via GitHub Pages, Netlify, Vercel, or custom servers):

```bash
# Compile and optimize Tailwind assets
npm run build

# To test your production build locally:
npm run preview
```

The compiled SPA bundle will be available inside the `/dist` directory. Because all key processes (such as PDF generation, QR compilation, and image resizing) run serverless/client-side, you can host `/dist` on any global CDN or static provider at absolute minimal costs.

---

## 🗂️ Project Structure

```
├── public/                 # Static assets (fonts, icons)
├── src/
│   ├── components/         # Global layout (Navbar, Footer, Hero)
│   │   ├── tools/          # Implementation code for all 16+ tools
│   │   └── LucideIcon.tsx  # Optimized icon map
│   ├── App.tsx             # Main dashboard rendering + category logic
│   ├── main.tsx            # Node & DOM entry point
│   ├── index.css           # Global fluid CSS & Tailwind v4 theme setups
│   └── types.ts            # Key shared interfaces & enums
├── metadata.json           # Application platform configuration
├── vite.config.ts          # Optimized bundler configuration
└── package.json            # Scripts and workspace dependencies
```

---

## 🛡️ Security & Privacy Notice

We strongly believe in personal data autonomy. **ToolMitra operates fully client-side**:
- All PDFs, passport photos, signature crops, and Aadhaar files are kept strictly within browser memory.
- There are **no telemetry trackers or background server uploads** of your private documents.
- Optional generative attributes (such as the AI Resume Reviewer) securely request Google’s Gemini API proxy securely to provide live intelligence.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE). 

_Designed and engineered with absolute craft as your visual and productive digital companion._ 🌟
