# 🏛️ Bingo2Gether — System Architecture

**Bingo2Gether** is a mobile-first gamified fintech application designed for couples and pairs to collaboratively save money toward shared life milestones.

```
                              ┌────────────────────────────────────────┐
                              │            Client Layer                │
                              │     React 19 + TypeScript + Vite       │
                              │   Tailwind CSS + Framer Motion + PWA   │
                              │   Offline-First State (localStorage)   │
                              └──────────────────┬─────────────────────┘
                                                 │
                                 HTTPS / WSS     │ Real-time & REST
                                                 ▼
                              ┌────────────────────────────────────────┐
                              │           Backend & Database           │
                              │         (Supabase / PostgreSQL)        │
                              │                                        │
                              │  ┌──────────────────┐  ┌─────────────┐ │
                              │  │  PostgreSQL DB   │  │  GoTrue     │ │
                              │  │  (Games/Couples) │  │  (Auth)     │ │
                              │  └────────┬─────────┘  └──────┬──────┘ │
                              │           │                   │        │
                              │           ▼                   ▼        │
                              │      Row Level Security (RLS Engine)   │
                              └──────────┬───────────────────┬─────────┘
                                         │                   │
                                         ▼                   ▼
                              ┌──────────────────┐   ┌─────────────────┐
                              │   Stripe BaaS    │   │  AI Oracle /    │
                              │ Checkout/Webhook │   │  Coach Gateway  │
                              └──────────────────┘   └─────────────────┘
```

---

## 🧩 Architectural Highlights

### 1. Mobile-First Presentation Layer
- **Responsive PWA**: Optimized for mobile viewports with haptic feedback vibrations and native install prompt (`InstallPrompt`).
- **Smooth Micro-interactions**: `framer-motion` spring animations for confetti celebrations, number draws, and card fills.
- **Dynamic Theming & Skins**: Real-time theme engine supporting multiple aesthetic styles (Carbon, Golden Era, Matrimoney, Viagem, etc.) with custom CSS variables.

### 2. Dual-Persistence State (Cloud + Offline-First)
- **Local Fallback**: Game state is continuously backed up to `localStorage` (`saveTogetherState`). If cloud services are unavailable, couples can seamlessly play offline.
- **Cloud Synchronization**: Supabase PostgreSQL database maintains partner-shared state with optimistic UI updates.
- **Row Level Security (RLS)**: Couple data is strictly partitioned so users can only read or write games belonging to their authenticated couple ID.

### 3. Monetization Engine
- **Stripe Checkout**: Webhook-driven subscription and lifetime pass fulfillment.
- **Entitlements Gate**: Feature flags managing access to unlimited AI coaching, premium skins, PDF printable boards, and advanced analytics.
