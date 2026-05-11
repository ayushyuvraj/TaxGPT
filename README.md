<div align="center">

# ₹ TaxGPT India

### India's Most Advanced AI Tool for the Income Tax Act 2025

*Zero-hallucination answers · Real-time streaming · Personalized tax intelligence*

[![⭐ Star This Repo](https://img.shields.io/badge/⭐_Star_This_Repo-6366f1?style=for-the-badge&logo=github&logoColor=white)](https://github.com/ayushyuvraj/TaxGPT/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Python](https://img.shields.io/badge/Python_3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)

**80 million Indian taxpayers. One law rewritten from scratch. Finally, an AI that actually reads it.**

[Quick Start](#-quick-start) · [Features](#-whats-inside) · [Setup Guide](#-setup-guide) · [Star This Repo ⭐](#-join-the-community)

</div>

---

## The Problem This Solves

On April 1, 2026, India replaced the 61-year-old Income Tax Act 1961 with an entirely new Act. Every section number changed. Assessment Year became Tax Year. Section 80C (the deduction everyone knows) is now Section 123. The TDS provisions that lived across 30+ scattered sections are now a single consolidated table at Section 393.

Generic AI tools hallucinate about this. They confidently cite sections that no longer exist.

**TaxGPT is different.** Every answer is grounded in 7,905 vectors built from the official Income Tax Act 2025 text, the Income Tax Rules 2026, and the Finance Bill 2026. If the Act doesn't say it, TaxGPT doesn't say it either.

---

## ✨ What's Inside

### 🤖 AI Assistant GenNext — Zero-Hallucination Tax Q&A

Ask any question about the new Act and get a streaming answer with inline citations to the exact sections it pulled from.

- **Real-time SSE streaming** — words appear as the model generates them, just like ChatGPT
- **Multi-conversation history** — collapsible sidebar with unlimited named conversations, rename/delete, keyboard shortcuts
- **Document analysis** — attach a PDF, JPG, or PNG (e.g. your Form 130 or a tax computation sheet) and ask questions about it
- **Invoice mode** — toggle to switch the model's context to invoice/receipt analysis
- **Inline citations** — every claim links to the exact Act section with the full text in a popup
- **Source pills** — all referenced sections and PDF sources shown below the answer, each clickable
- **Content filter bypass** — in a multi-turn conversation, follow-up questions flow naturally without repeated validation
- **Contextual query rewriting** — the engine rewrites your question using chat context before searching the index, so "what about the previous section?" actually works

> **Powered by 7,905 vectors** from 6 official PDFs: Income Tax Act 2025 (amended), Income Tax Rules 2026, Finance Bill 2026, 536 individual section PDFs, and 16 schedule PDFs.

---

### 🧠 Personal Tax Intelligence Dashboard — Know Your Exact Tax Position

Select your profile, enter your numbers, and get a complete tax intelligence report in seconds.

**Five taxpayer profiles:**

| Profile | Key Inputs | What You Get |
|---------|-----------|-------------|
| 🏢 Salaried Employee | Gross income, HRA city, regime choice | Full slab breakdown, HRA exemption, standard deduction |
| 💼 Business Owner | Turnover, entity type | Presumptive tax, MAT applicability, advance tax schedule |
| 📈 Investor | Asset types, LTCG estimate | STT impact, buyback taxation, LTCG/STCG split |
| 🌏 NRI | Residence country, India income | DTAA applicability, foreign asset disclosure, TAN removal |
| 💻 Freelancer | Annual income, expense category | Presumptive tax thresholds, TDS deducted, ITR deadline |

**What you see after analysis:**

**Tax Health Score** — A single number (0–100) with a letter grade (A+ to D) shown inside an animated SVG ring. The score breaks down across four pillars:
- *Regime (25 pts)* — are you on the winning regime for your income profile?
- *Deductions (40 pts)* — how much of your available savings space are you using?
- *Compliance (25 pts)* — any overdue deadlines eating into your score?
- *Filing Readiness (10 pts)* — are your documents and advance tax in order?

**Tax Waterfall Chart** — A stacked bar chart showing exactly how your income flows through each tax slab. Hover any bar to see the rate, income in slab, and tax on that slab. One glance tells you whether you're mostly in the 5% band or the 30% band.

**New vs Old Regime Comparison** — Side-by-side bars with the winner highlighted. Shows effective rate for both regimes, the saving amount, and a full deduction breakdown so you understand *why* one regime wins for your situation.

**Savings Ranker** — Every applicable tax-saving opportunity ranked by potential saving. Each row shows:
- The exact saving in ₹, the Act section, and the required effort (Zero / Low / Medium / High)
- A utilization bar showing current vs maximum deduction amount
- A checkbox — mark it done to instantly watch your Tax Health Score ring animate upward

**Compliance Calendar** — A chronological timeline of every deadline that applies to your profile: filing dates, advance tax instalments, investment cut-offs, and transition deadlines. Color-coded by urgency (red ≤14 days, amber ≤30 days).

**Saved Profiles Panel** — Save any analysis as a named snapshot. Up to 10 snapshots persist in localStorage. Come back tomorrow, load your saved analysis, and your score, waterfall, ranker checkboxes, and compliance calendar are all restored. The sidebar nav item pulses red when a saved deadline is within 7 days.

---

### 🗺️ Section Mapper — Navigate the Old → New Act Instantly

The entire mapping of 1961 Act sections to 2025 Act sections, loaded offline from JSON. No API call. No wait time.

- Type "80C" → instantly see Section 123, what changed, and why
- Covers sections, forms (Form 16 → Form 130, Form 26AS → Form 168), and concepts (Assessment Year → Tax Year)
- **Category Bento Grid** — browse mappings by category: deductions, TDS, returns, assessment, exemptions, general
- Each category expands to show every entry with old → new at a glance
- Fully offline — works even without an API key configured

---

### ↔️ Compare Acts — Read Both Laws Side by Side

Select any section from the 1961 Act on the left and the 2025 Act on the right, and read them simultaneously. Stop guessing what changed — see it.

- Two independent searchable dropdowns (530+ sections each)
- Full section text extracted from official PDFs
- Auto-match: select an old section, the corresponding new section highlights automatically
- "What Changed" summary badge for every mapped section
- Works for sections with no direct mapping too — useful for studying the structure of the new Act

---

### 📄 Notice Decoder — Understand Any Tax Notice in Plain English

Receive a notice from the Income Tax Department? Paste the text, click Analyze, and get:

- **Severity rating**: Critical / High / Medium / Low with color-coded badge
- **Plain English explanation** of what the notice means and what triggered it
- **Exact sections cited** in the notice, mapped to their 2025 Act equivalents
- **Recommended next steps**

No more panic. No more expensive CA consultations for a routine 270(1) intimation.

---

### 🎛️ Five AI Providers — Use Whatever You Have

TaxGPT works with every major AI provider. Switch anytime from the header.

| Provider | Cost | Best For |
|----------|------|----------|
| **Google Gemini** | Free tier available | Getting started, most users |
| **OpenAI GPT-4o** | Pay-per-use | Highest quality answers |
| **Anthropic Claude** | Pay-per-use | Nuanced legal reasoning |
| **OpenRouter** | Free tier + 100+ models | Experimenting with models |
| **Ollama** | Free, fully local | Privacy-first, offline use |

> **Note:** `OPENAI_API_KEY` is always required (even if you use Gemini for generation) because the FAISS vector index was built with OpenAI `text-embedding-3-small`. Your generation LLM is freely switchable.

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/ayushyuvraj/TaxGPT.git
cd TaxGPT

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend && npm install && cd ..

# Start backend  (Terminal 1)
python api/main.py

# Start frontend  (Terminal 2)
cd frontend && npm run dev
```

Open **http://localhost:5173** — the app loads with the knowledge base ready (7,905 vectors pre-indexed, no ingestion step needed). You'll be prompted to add your API keys in the application interface.

---

## 🔧 Setup Guide

### Prerequisites

Before you start, make sure you have these three tools installed:

1. **Python 3.11+** — [Download here](https://www.python.org/downloads/)
2. **Git** — [Download here](https://git-scm.com/downloads)
3. **Node.js 18+** — [Download here](https://nodejs.org/)

### Step 1 — Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/ayushyuvraj/TaxGPT.git
cd TaxGPT

# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2 — Run the App

Open two terminal windows and run these commands:

**Terminal 1 — Start the Backend:**
```bash
python api/main.py
```

**Terminal 2 — Start the Frontend:**
```bash
cd frontend && npm run dev
```

Then open **http://localhost:5173** in your browser. The app will load with the knowledge base ready (7,905 tax law vectors pre-loaded).

**Add Your API Keys:** When the app opens, click the settings icon or "Configure Providers" button in the top right. Paste your API keys there:
- **OPENAI_API_KEY** (required for embeddings) — Get it from [openai.com](https://platform.openai.com/api-keys)
- **One generation provider** (pick one):
  - **GEMINI_API_KEY** (free tier available) — Get it from [aistudio.google.com](https://aistudio.google.com)
  - **ANTHROPIC_API_KEY** — Get it from [console.anthropic.com](https://console.anthropic.com)
  - **OPENROUTER_API_KEY** — Get it from [openrouter.ai](https://openrouter.ai)

The Dashboard will show `Knowledge Index: 7905 vectors · Ready` once the app fully loads.

---

## 🏗️ Architecture

```
TaxGPT v2.0/
├── api/                    # FastAPI backend
│   ├── main.py             # App factory, CORS, lifespan startup
│   ├── dependencies.py     # Shared DI: API keys from headers/env
│   ├── routers/            # One router per feature domain
│   │   ├── qa_gennext.py   # Streaming RAG Q&A (SSE)
│   │   ├── profile.py      # Profile analysis (SSE + tax computation)
│   │   ├── mapper.py       # Section mapping endpoints
│   │   ├── notice.py       # Notice decoder
│   │   ├── compare.py      # Act comparison / section text
│   │   └── health.py       # Health check + vector count
│   └── schemas/            # Pydantic request/response models
│
├── src/                    # Core Python business logic
│   ├── rag_engine.py       # Hybrid BM25 + vector retrieval + reranking
│   ├── tax_calculator.py   # Slab-by-slab computation, regime comparison
│   ├── prompts.py          # All LLM prompt templates (centralised)
│   ├── section_mapper.py   # Offline JSON-first section lookup
│   ├── notice_decoder.py   # Notice severity + section extraction
│   └── providers/          # LLM provider abstraction layer
│       ├── gemini.py       # Google Gemini (generate + embed)
│       ├── openai.py       # OpenAI GPT-4o
│       ├── claude.py       # Anthropic Claude
│       ├── openrouter.py   # OpenRouter multi-model
│       └── ollama.py       # Local Ollama (OpenAI-compatible)
│
├── frontend/src/           # React 19 + TypeScript + Vite
│   ├── App.tsx             # Root layout, navigation, urgency banner
│   ├── components/         # Page components + shared UI
│   ├── hooks/              # React Query hooks (data fetching)
│   ├── store/              # Zustand stores (API keys, conversations, snapshots)
│   └── lib/                # Types, API client, tax health score algorithm
│
└── data/
    ├── faiss_index/        # Pre-built vector index (7,905 vectors, ~136MB)
    │   ├── index.faiss         # FAISS IndexFlatIP (47MB)
    │   ├── embeddings_cache.npy  # Embedding cache (47MB)
    │   ├── chunks.json         # Child chunk metadata (12MB)
    │   ├── parents.json        # Parent chunk text (8.8MB)
    │   ├── bm25_index.pkl      # BM25 sparse index (8.1MB)
    │   └── bm25_corpus.json    # BM25 corpus (14MB)
    └── section_mapping.json    # Old→New section map (offline backbone)
```

### Retrieval Pipeline

Every query goes through a 5-stage pipeline before reaching the LLM:

1. **Context rewrite** — multi-turn conversations are rewritten into a standalone question using the last 3 turns
2. **Old section detection** — if the query references a 1961 Act section, it's augmented with the 2025 equivalent before embedding
3. **Hybrid search** — BM25 keyword search (top-20) fused with vector search (top-8), merged and deduplicated
4. **Parent enrichment** — each retrieved child chunk is expanded with its parent section for full context
5. **Reranking** — direct section matches bubble up; related sections and parent context follow

The result: answers that cite the right section, not just the nearest one.

---

## 📊 Knowledge Base

| Source | Coverage |
|--------|---------|
| Income Tax Act 2025 (amended by Finance Act 2026) | Full text, all schedules |
| Income Tax Rules 2026 | Full text |
| Finance Bill 2026 | Full text |
| 536 individual Section PDFs | One-per-section, highest fidelity |
| 16 Schedule PDFs | Complete |

| Index Stat | Value |
|-----------|-------|
| Total vectors | **7,905** |
| Parent chunks | 1,391 |
| Embedding model | `text-embedding-3-small` (1536 dims) |
| Vector store | FAISS `IndexFlatIP` with L2 normalization |
| Hybrid search | BM25 + cosine similarity, fused |
| Characters indexed | 8,507,000+ |

---

## 🎨 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, Framer Motion |
| Charts | Recharts (tax waterfall, regime compare) |
| State | Zustand (API keys, conversations, profile snapshots) |
| Data Fetching | TanStack React Query |
| Backend | FastAPI (Python 3.11+), Uvicorn |
| Vector Store | FAISS `faiss-cpu` |
| Embeddings | OpenAI `text-embedding-3-small` |
| LLM Providers | Google Gemini, OpenAI, Anthropic, OpenRouter, Ollama |
| Streaming | Server-Sent Events (SSE) |
| Persistence | localStorage (client-side snapshots + conversations) |

---

## 🙋 Frequently Asked Questions

**Do I need to build the vector index myself?**
No. The full index (7,905 vectors, ~136MB) is committed to this repository and loads automatically when you start the backend. There is no ingestion step.

**Can I use Ollama to run this fully locally?**
Yes. Set `LLM_PROVIDER=ollama` and point it at your Ollama instance. You still need `OPENAI_API_KEY` for query embedding (the index is built with OpenAI embeddings). Generation is fully local.

**Will this work for the old Income Tax Act 1961?**
The Section Mapper handles old→new mappings instantly from JSON. The AI assistant understands old section numbers (e.g. "What is 80C?") and answers using the new Act, explicitly noting the section has moved.

**How accurate are the tax calculations?**
The tax computation engine implements the slab rates, standard deduction, rebate, surcharge, and cess exactly as defined in the Finance Act 2026. It is provided for educational purposes — always verify with a qualified CA for actual tax filing.

**Is my data sent anywhere?**
Your API keys stay in `localStorage` on your machine. Queries go directly from your browser to your chosen AI provider (Gemini, OpenAI, etc.) via the local backend. Nothing is logged to any third-party service.

---

## 🤝 Join the Community

This project represents hundreds of hours of work to make Indian tax law accessible to every taxpayer who reads English or Hindi.

If TaxGPT helped you understand the new Act, saved you a CA consultation fee, or just impressed you — **please star this repository.** It takes 2 seconds and means a lot.

[![Star This Repository](https://img.shields.io/badge/⭐_Star_This_Repo-6366f1?style=for-the-badge&logo=github&logoColor=white)](https://github.com/ayushyuvraj/TaxGPT)

### Share Your Experience

Found something impressive? Figured out a tricky deduction? Got a great answer about Section 393?

**Post it.** Tag **[@ayushyuvraj](https://github.com/ayushyuvraj)** and use **#TaxGPTIndia**. The best interactions will be featured here.

### Contributing

Pull requests are welcome. If you find a section mapping that's wrong, a calculation that doesn't match the Act, or a UI bug — open an issue. Every contribution helps 80 million taxpayers.

```bash
# Fork → clone → create branch → make changes → open PR
git checkout -b fix/section-mapping-80ccd
```

Areas where contributions are especially valuable:
- **Section mapping corrections** — `data/section_mapping.json` is the offline backbone
- **Prompt improvements** — `src/prompts.py` contains all LLM templates
- **New taxpayer profiles** — add to `src/tax_calculator.py`
- **Hindi language support** — the engine detects Hindi queries, responses can be improved

---

## 📄 License

MIT License — use it, fork it, build on it. A credit back to this repository is appreciated.

---

<div align="center">

Built with obsession by **[Ayush Yuvraj](https://github.com/ayushyuvraj)**

*Because every Indian taxpayer deserves to understand the law that governs them.*

**[⭐ Star this project](https://github.com/ayushyuvraj/TaxGPT)** · **[🐛 Report a bug](https://github.com/ayushyuvraj/TaxGPT/issues)** · **[💡 Request a feature](https://github.com/ayushyuvraj/TaxGPT/issues)**

</div>
