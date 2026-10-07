# EcoSort ♻️

**An AI-Enabled Smart Waste Segregation, Recycling and Collection Management System**

> Sort Smart. Recycle Better. Keep Earth Cleaner.

EcoSort helps people identify waste from a photo, learn how to dispose of it safely, sell recyclable materials and e-waste, request doorstep pickups, track the collection in real time, earn EcoPoints and see their estimated environmental impact.

It is a B.Tech mini-project. It demonstrates **React + Firebase Auth + Firestore + role-based access + CRUD + dashboards + analytics** and keeps the architecture simple enough to explain in a viva.

---

## 1. Features

| Area | What it does |
| --- | --- |
| Authentication | Register, login, logout, forgot password and protected routes. Users are redirected to their dashboard based on role. |
| Three roles | **User**, **Collector / Recycler** and **Admin**. The role is stored in Firestore and enforced by security rules and Cloud Functions. |
| AI Waste Identification | Upload or take a photo. The AI returns item, category, confidence, description, recommended action and estimated value. A low-confidence warning is shown when needed. |
| Manual fallback | If AI is unavailable, the user picks one of the 5 categories manually and the app keeps working. |
| Disposal recommendation | "What should you do with this?" shows the category, the reason, the safe disposal method, whether the item can be sold and whether pickup is available. |
| Disposal guide | Searchable "How Should I Dispose This?" guide that works without AI. |
| Marketplace | Create, edit, delete and view listings (Recyclable / E-Waste). Collectors make offers and sellers accept or reject them. The listing is marked sold when the sale or collection is complete. No payment gateway is used. |
| Estimated value | Configurable sample rates in Firestore, always shown with "Estimated value only. Actual recycler price may vary." |
| Pickups | Request pickup and follow the live timeline: Requested → Assigned → On The Way → Collected → Completed (or Cancelled). |
| Collector assignment | Admin assigns manually. A simple suggestion ranks collectors by service area, availability and current workload. |
| Collector dashboard | Assigned, pending, completed and today's pickups, with Accept, On The Way, Collected and Completed buttons. |
| EcoPoints | Points are awarded **once** per event by Cloud Functions. Levels: Eco Starter → Green Explorer → Eco Guardian → Green Champion. |
| Environmental impact | Estimated waste diverted, recyclable kg, e-waste kg, responsible actions and CO₂e, using admin-configurable factors. |
| Complaints | Report illegal dumping, overflowing garbage, burning and similar problems. Admin reviews them, and a resolved report earns points. |
| Recycling partners | Directory managed by admin. Users see active partners. |
| Notifications | In-app notifications created by Cloud Functions (assignment, status changes, offers, points). |
| Admin panel | Dashboard with 4 charts, plus Users, Waste, Marketplace, Pickups, Collectors, Complaints, Partners, Categories, Rewards, Analytics and Settings. |
| UX | Responsive (mobile drawer menu), loading skeletons and spinners, empty states, friendly error messages and an error boundary so the screen is never blank. |

## 2. Technology stack

- **Frontend:** React 19, React Router 7, Vite, Tailwind CSS 4, Recharts (charts), Lucide (icons)
- **Backend:** Firebase Authentication, Cloud Firestore, Cloud Functions (Node.js 22, 2nd gen)
- No separate Express server, Redux, Docker or payment gateway.

## 3. Folder structure

```
miniproject/
├── src/                      React app
│   ├── firebase/config.js    Firebase initialisation (+ emulator connection)
│   ├── context/              AuthContext (user + Firestore profile/role)
│   ├── hooks/                useAuth, useRealtime, useSettings, useUserActivity, useAdminData, useCategories
│   ├── services/             authService, wasteService, listingService, pickupService,
│   │                         complaintService, rewardService, notificationService,
│   │                         partnerService, adminService
│   ├── components/
│   │   ├── ui/               Button, Card, Modal, Input/Select/Textarea, StatusBadge,
│   │   │                     LoadingSpinner, Skeleton, EmptyState, Alert, DataTable, ...
│   │   ├── layout/           Navbar, Sidebar, ProtectedRoute, navConfig
│   │   └── charts/           CategoryChart, AdminCharts
│   ├── layouts/              PublicLayout, DashboardLayout
│   ├── pages/                public/ user/ collector/ admin/ shared/
│   └── utils/                constants, validation, errors, format, impact, guideData, ...
├── functions/                Cloud Functions
│   ├── src/ai/               prompt + providers (gemini.js, openai.js) + normalize.js
│   ├── src/handlers/         classify, pickups, listings, complaints, admin
│   └── test/                 unit tests for the AI response normaliser
├── scripts/                  seed.js (config + demo data), setRole.js (create admin)
├── firestore.rules           Firestore security rules
├── firebase.json             Hosting / Functions / Emulator configuration
└── .env.example              Frontend environment variables template
```

## 4. Firebase setup

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → create a database (production mode). Choose a location such as `asia-south1`.
4. **Project settings → Your apps → Add web app**, then copy the config values.
5. Install the Firebase CLI and log in:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add        # select your project
   ```

## 5. Environment variables

Copy `.env.example` to `.env` and fill in the web app values:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FUNCTIONS_REGION=asia-south1
VITE_USE_EMULATORS=false
```

The Firebase web config only *identifies* the project; it is not a secret. Security comes from Authentication and the security rules. **Never put the AI API key in `.env` or anywhere in `src/`.**

## 6. How to run locally

```bash
npm install
npm --prefix functions install
```

### Option A: Firebase Emulator Suite (free, recommended for development)

Requires Java 11+ (JDK 21 recommended) and `firebase-tools`.

```bash
# .env
VITE_USE_EMULATORS=true
# (other VITE_FIREBASE_* values can stay empty for the emulator)

# optional: AI key for the emulator only (git-ignored)
copy functions\.secret.local.example functions\.secret.local   # then edit it

# terminal 1
npm run emulators              # Auth, Firestore, Functions + UI at http://localhost:4000

# terminal 2 - demo accounts + demo data (password comes from an env variable)
$env:DEMO_PASSWORD="choose-a-password"     # PowerShell   (bash: export DEMO_PASSWORD=...)
npm run seed:emulator

# terminal 3
npm run dev                    # http://localhost:5173
```

### Option B: Real Firebase project

Set the real values in `.env` (`VITE_USE_EMULATORS=false`), deploy rules and functions (section 9), then run `npm run dev`.

## 8. Demo accounts (development only)

`npm run seed:emulator` creates these accounts, using the password from `DEMO_PASSWORD` (never hard-coded):

| Role | Email |
| --- | --- |
| User | `demo-user@example.com` (also `demo-user2@example.com`) |
| Collector | `demo-collector@example.com` (also `demo-collector2@example.com`) |
| Admin | `demo-admin@example.com` |

All demo documents carry `isDemo: true` and are labelled "Demo" in the UI. Remove them with `npm run seed:clear-demo`. The seed script **refuses** to write demo data to a real project unless you add `--allow-production`.

**Creating the first admin on a real project (no demo data):**

1. Register normally in the app (the account gets the USER role).
2. Authenticate the Admin SDK on your computer: `gcloud auth application-default login`, or set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account key that you **never commit**.
3. Run `npm run seed:config` to write the categories and settings.
4. Run `node scripts/setRole.js you@example.com admin`.
5. Create collectors from **Admin → Collectors → Add collector**. Alternatively, run `node scripts/setRole.js someone@example.com collector "Area 1, Area 2"`.

## 9. How to build and deploy

```bash
npm run build                                  # production build into dist/
firebase deploy --only firestore:rules        # security rules
firebase deploy --only functions               # Cloud Functions (asks for AI_API_KEY if missing)
firebase deploy --only hosting                 # React app (Firebase Hosting)
# or everything at once
firebase deploy
```

The Functions region is `asia-south1`. If you change it in `functions/src/constants.js`, also change `VITE_FUNCTIONS_REGION`.

## 10. Firestore collections

| Collection | Purpose | Written by |
| --- | --- | --- |
| `users` | Profile + `role` + `ecoPoints` + `active` | User (own basic fields), Functions (role/points/active) |
| `collectors` | Service areas and availability of collectors | Functions / admin, collector (own `available`) |
| `wasteItems` | AI / manual classification history | User (own) |
| `wasteListings` | Marketplace listings (`private/arrangement` sub-doc holds contact details after acceptance) | Seller (create/edit while AVAILABLE), Functions (status) |
| `pickupRequests` | Pickup requests with `status` and `history` | User (create), Functions (assign/status) |
| `complaints` | Waste problem reports | User (create), Functions (status) |
| `partners` | Recycling partner directory | Admin |
| `rewardTransactions` | One document per reward (ID such as `PICKUP_<pickupId>`) | Functions only |
| `notifications` | In-app notifications | Functions (create), user (mark read / delete) |
| `categories` | Editable text for the 5 fixed categories | Admin |
| `settings` | `rewards`, `rates` (value rates), `impact` (conversion factors) | Admin |

Dashboard statistics are **calculated from queries**, not stored as duplicate counters.

## 11. Security

- **Roles:** stored in `users/{uid}.role`. Self-registration can only create `role: "user"` with `ecoPoints: 0`, and users can never change their role, points or active flag.
- **Firestore rules (`firestore.rules`):**
  - Users read and write only their own data.
  - Collectors read only pickups where `collectorId == uid` and cannot read the `users` collection.
  - Admins have full access.
  - Field validation covers categories, quantity > 0, price ≥ 0, date format and allowed keys, and `createdAt` must be a server timestamp.
- **Server-only operations (Cloud Functions):**
  - Assigning collectors and every pickup, listing and complaint status change, with transitions validated on the server.
  - Awarding EcoPoints, creating notifications, and creating or deactivating accounts.
- **Points exactly once:** completion runs in a Firestore **transaction**. The reward document ID is deterministic (`PICKUP_<id>`, `SALE_<id>`, `COMPLAINT_<id>`). If it already exists, no points are added, and a completed pickup cannot be completed again.
- **No duplicate pickups:** the pickup document ID is generated when the form opens and the button is disabled while submitting. A second write with the same ID would be an *update*, which the rules deny.
- Admin credentials and service-account keys are never in the repo (see `.gitignore`).
- Route guards in React are only for navigation. Real protection is in the rules and functions.

## 12. EcoPoints

| Event | Points (default, editable in Admin → Rewards) |
| --- | --- |
| Recyclable pickup completed | +20 |
| E-waste pickup completed | +50 |
| Other pickup completed (organic / hazardous / general) | +10 |
| Recycling / sale completed | +30 |
| Verified (resolved) waste complaint | +15 |

Levels: 0–99 Eco Starter · 100–249 Green Explorer · 250–499 Eco Guardian · 500+ Green Champion.

## 13. Demo flow (for the viva)

1. **Landing page:** explain the idea and the five categories.
2. **Login as `demo-user`:** the dashboard shows the cards, eco level, impact, chart and recent activity.
3. **Identify Waste:** upload a photo and click **Analyze Waste**. Show the category, confidence and "What should you do with this?". Without an AI key, show the **manual fallback**.
4. Click **Sell This Waste** (pre-filled listing) or **Request Pickup** (pre-filled request).
5. **Login as `demo-admin`** (another browser or incognito window):
   - On **Pickups**, assign a collector and point out the *Suggested* badge with its reasons.
6. **Login as `demo-collector`:**
   - Click **Accept**, then **On The Way**, **Collected** and **Completed**.
   - The user's **My Pickups** timeline updates live.
7. **Back as user:** a notification says "You earned 20/50 EcoPoints". Check **EcoPoints** history and **Environmental Impact**.
8. **Marketplace:** the collector makes an offer and the user accepts it. Contact details become visible to both, then **Mark transaction completed** awards +30.
9. **Report Problem:** the user submits a report, and the admin sets it to Resolved, which awards +15.
10. **Admin dashboard and Analytics:** charts by category, pickup status, collection over time and user participation.

## 14. Testing

```bash
npm run lint               # ESLint
npm run build              # production build
npm run test:functions     # unit tests for AI response validation
```

**Manual checklist:**

- **Auth:** register, login, logout, wrong password, password reset.
- **Waste:** upload, AI classification, manual fallback, saved history.
- **Marketplace:** create, edit, delete, offer, accept, sold.
- **Pickups:** create, assign, every status, completion, a second completion is rejected.
- **Points:** awarded once.
- **Complaints:** create a report, then update it as admin.
- **Admin pages and responsive layout:** check on desktop, tablet and mobile.

## 15. Known limitations

- Cloud Functions and Storage need the Firebase **Blaze** plan in production (the emulator is free).
- AI results can be wrong, which is why the confidence, low-confidence warning and manual correction exist.
- Value rates, environmental factors and CO₂ figures are **sample estimates**, not live market prices or scientific measurements.
- No online payment: marketplace deals are "Sale / Collection Arrangements" settled offline.
- No real-time GPS tracking, and notifications are in-app only (no SMS/email).
- Collector suggestion uses simple text matching of service areas against the address.
- Lists load the full collection (fine for a mini-project). Large deployments would need pagination.
