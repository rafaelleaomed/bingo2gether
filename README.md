# 🎲 Bingo2Gether

> Gamified savings platform transforming shared financial milestones into an engaging, progressive bingo game for couples.  
> Addressing money-related relationship stress through behavioral economics, proportional income equity, and habit design.

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live%20Demo-bingo2gether--f2631.web.app-blueviolet?style=for-the-badge&logo=firebase)](https://bingo2gether-f2631.web.app)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6-purple?logo=vite)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwind-css)
![PWA](https://img.shields.io/badge/PWA-Mobile--First-success)

</div>

---

## 💡 The Problem: Money Friction in Relationships

Financial disagreements remain the leading cause of relationship friction. When couples attempt to save for major milestones (weddings, home downpayments, bucket-list travel):
- **Traditional budgeting feels punitive**: Rigid spreadsheets and expense trackers create dread and are typically abandoned within two months.
- **Income disparities cause silent resentment**: Strict 50/50 splits place disproportionate strain on the lower-earning partner.
- **Lack of positive reinforcement**: Saving is delayed gratification without tangible micro-milestones.

---

## 🎯 The Solution: Gamified Collaborative Savings

**Bingo2Gether** transforms financial discipline into a collaborative board game:
1. **The Goal as a Bingo Board**: The couple defines their target milestone. The app automatically computes a progressive grid of $N$ numbers where the cumulative sum ($\sum_{i=1}^N i$) equals the exact financial goal.
2. **Equity Algorithm (Power Law)**: Income-proportional weighting distributes larger numbers to the higher earner and smaller denominations to the other partner—ensuring financial fairness with equal emotional pride.
3. **Weekly Couple Rituals**: The partners gather weekly to draw their numbers, mark their physical or digital boards, and build a continuous shared streak.

---

## ✨ Key Features

- 🎲 **Interactive Progressive Bingo**: Dynamic number drawing with real-time card fills and celebratory animations.
- ⚖️ **Equity Calculator**: Proportional income distribution algorithm eliminating financial imbalance.
- 📱 **Mobile-First PWA Experience**: Installable on iOS/Android home screens with tactile micro-interactions and dark mode.
- 🎨 **Visual Themes & Skins**: Customizable aesthetics (Carbon, Golden Era, Matrimoney, Travel, Cyberpunk).
- 🤖 **AI Financial Coach (Oracle)**: Natural language conversational assistant powered by Google Gemini to advise couples on budgeting challenges.
- 🖨️ **Printable High-Res PDF**: Generates custom wall posters for couples who love tactile pen-and-paper tracking.
- 🛡️ **Offline-First Demo Mode**: Fully functional client-side fallback allowing exploration without active cloud dependencies.

---

## 📚 Technical Documentation

Explore the architecture and product specifications in the [`/docs`](docs/) directory:

| Document | Focus |
| :--- | :--- |
| [**Architecture Specification**](docs/architecture.md) | Client React architecture, Supabase sync, and Stripe webhook flows |
| [**Gamification & Behavioral Economics**](docs/gamification-mechanics.md) | Gauss summation formula, Power Law income equity, and habit design |
| [**Monetization & Economics**](docs/monetization-model.md) | Freemium SaaS breakdown, Stripe tiers, and lifetime couple passes |
| [**Product Roadmap**](docs/roadmap.md) | Vision from PWA MVP to Open Finance / PIX automated bank sync |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion
- **Icons & UI**: Lucide React, Canvas Confetti
- **State Management**: Zustand (dual-state with local storage sync)
- **Backend & Auth**: Supabase (PostgreSQL, Row Level Security, GoTrue Auth)
- **Payments**: Stripe Checkout & Customer Portal
- **AI Gateway**: Google Gemini Flash via AI Gateway

---

## 🚀 Quickstart & Demo Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- `npm` or `yarn`

### Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rafaelleaomed/bingo2gether.git
   cd bingo2gether
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local development server:**
   ```bash
   npm run dev
   ```

4. **Explore the Demo**:
   Click the **"Explorar no Modo Demonstração (Portfólio / Offline)"** button on the welcome screen to test the complete onboarding, bingo draws, and dashboard instantly without requiring external database credentials.

---

## 👨‍💻 Author

**Rafael Leão, MD**  
*Physician exploring AI in healthcare, digital health products, and gamified consumer software.*  
- **GitHub**: [@rafaelleaomed](https://github.com/rafaelleaomed)  
- **LinkedIn**: [rafaelleaomed](https://linkedin.com/in/rafaelleaomed)
