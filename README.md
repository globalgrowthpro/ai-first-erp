# AI First ERP

Next-generation enterprise management platform designed with AI-first workflows and real-time operational control.

**Developer:** Mr. Hafez Rahim  
**Contact:** info@odooteams.com | +201007419344

---

## 📁 Project Structure

```text
ai-first-erp/
├── docs/                       # Comprehensive project & deployment documentation
│   ├── Antigravity_Inventory_On_Demand_Products_Guide.md
│   ├── CPANEL_HPANEL_DEPLOY_GUIDE.md
│   └── DATA_PERSISTENCE_AUDIT.md
├── public/                     # Static assets (logos, avatars, product catalog)
│   ├── avatars/                # Clean employee & user avatars
│   ├── logos/                  # Partner & supplier vector logos
│   └── products/               # POS & inventory product photography
├── scripts/                    # Build & database utility scripts
│   ├── post-build.mjs          # Production bundle packager
│   ├── seed_supabase.mjs       # Supabase schema & initial data seeder
│   └── seed_rich_real_moves.mjs# Inventory ledger & stock movements seeder
├── src/                        # Application source code
│   ├── components/             # Reusable UI & business module components
│   ├── hooks/                  # Custom React hooks
│   ├── integrations/           # Backend services & Supabase client
│   ├── lib/                    # Business stores, utilities, data adapters
│   ├── routes/                 # TanStack file-based routes
│   ├── router.tsx              # Router instance & configuration
│   └── styles.css              # Global styling & Tailwind directives
├── supabase/                   # Supabase migrations & database configuration
├── app.js                      # Production Node.js server runner (cPanel / hPanel)
└── vite.config.ts              # Vite & TanStack build configuration
```

---

## 🚀 Quick Start

Ensure you have **Node.js** (v20+) and **npm** installed.

```sh
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Production build
npm run build

# 4. Run production server
npm start
```

---

## 📚 Documentation

- [Production Deployment Guide (cPanel / hPanel)](docs/CPANEL_HPANEL_DEPLOY_GUIDE.md)
- [Inventory On-Demand & Manufacturing Guide](docs/Antigravity_Inventory_On_Demand_Products_Guide.md)
- [Data Persistence & Local Storage Audit](docs/DATA_PERSISTENCE_AUDIT.md)
