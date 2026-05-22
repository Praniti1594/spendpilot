# SpendPilot - AI Spend Audit Tool

An AI-powered SaaS MVP that analyzes company spending on AI tools and recommends cost optimization strategies.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase project
- Groq API key

### Setup
1. Install dependencies: `npm install`
2. Follow [BACKEND_SETUP.md](./BACKEND_SETUP.md) to configure Supabase & Groq
3. Update `.env.local` with your API credentials
4. Run: `npm run dev`
5. Open http://localhost:3000

## 🏗️ Architecture

### Backend (Complete ✅)
- **API Routes**: RESTful endpoints for audits
- **Audit Engine**: Deterministic spend analysis logic
- **Groq AI**: Personalized summary generation
- **Supabase**: PostgreSQL database for audit storage

### Frontend (In Progress)
- Spend audit form
- Real-time results display
- Public sharing pages
- Mobile responsive

## 📊 User Flow

1. **Landing**: Visitor arrives at homepage
2. **Input**: Enter AI tools, plans, spend, and seat counts
3. **Instant Analysis**: Get recommendations and savings calculation
4. **AI Summary**: Personalized optimization insights
5. **Share**: Generate public result URL
6. **Lead Capture**: Optional signup after value shown

## 🎯 Features

### Core
- ✅ No auth required (form state in localStorage)
- ✅ Deterministic audit logic
- ✅ Finance-literate recommendations
- ✅ 8 supported AI tools
- ✅ Annual savings calculations
- ✅ Public result pages

### AI Integration
- ✅ Groq API for summaries (Llama 3.1 70B)
- ✅ Only used for personalized text
- ✅ Audit logic is deterministic

### Security
- ✅ Public result pages hide sensitive input data
- ✅ Form data stored in localStorage (not sent anywhere until user submits)
- ✅ Supabase RLS policies for access control

## 📁 Project Structure

```
├── app/
│   ├── api/audits/          # API routes
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Homepage
├── lib/
│   ├── db/                  # Database & types
│   ├── audit/               # Business logic
│   └── utils/               # Helpers
├── public/                  # Static assets
├── .env.local               # Environment variables (add your keys here)
└── README.md
```

## 🔧 Tech Stack

- **Frontend**: Next.js 14+, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **AI**: Groq API (Llama 3.1 70B)
- **Deployment**: Vercel

## 📝 API Endpoints

### POST /api/audits
Create a new spend audit.

### GET /api/audits/[id]
Retrieve a public audit result.

### PATCH /api/audits/[id]
Update audit (make public, add summary).

See [BACKEND_SETUP.md](./BACKEND_SETUP.md) for detailed API reference and examples.

## 🛠️ Development

### Run dev server
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Test API
See cURL examples in [BACKEND_SETUP.md](./BACKEND_SETUP.md)

## 📚 Documentation

- [BACKEND_SETUP.md](./BACKEND_SETUP.md) - Backend configuration & API reference
- API types in [lib/db/types.ts](./lib/db/types.ts)
- Audit logic in [lib/audit/engine.ts](./lib/audit/engine.ts)

## 🚀 Deployment

Deploy to Vercel:
1. Push to GitHub
2. Connect Vercel to repo
3. Add environment variables to Vercel dashboard
4. Deploy

## 📄 License

MIT

---

**Current Status**: Phase 1 (Backend) complete. Next: Frontend development.
