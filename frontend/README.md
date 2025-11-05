# BIBLIO V4 – Frontend

Modern Digital Library web app (frontend).

- Tech stack: React + TypeScript + Tailwind + shadcn/ui + Vite
- Backend: FastAPI hosted on Render

## 🔗 API Configuration

Set your API base URL in `.env`:

```
VITE_API_URL=https://biblio-h6ji.onrender.com
```

During local development, the frontend consumes the live backend on Render.

## 🧩 CORS Setup (backend)

Ensure your backend Render service allows these origins:

```
http://localhost:5173
http://127.0.0.1:5173
https://<your-frontend-domain>.vercel.app
```

## 🚀 Commands

```sh
npm install
npm run dev       # Local development
npm run build     # Build for production
npm run preview   # Preview build
```

## 📡 Deployment

You can deploy the frontend to:

- Render → static site; set `VITE_API_URL` env var
- Vercel / Netlify → connect the repo and set `VITE_API_URL`

## 🧠 Notes

- All API calls are centralized in `src/lib/api.ts`.
- Use `apiFetch()` for JSON and `apiUpload()` for file uploads.
- JWT tokens are handled automatically by `src/providers/AuthProvider.tsx`.
- The app is cloud-ready (no localhost dependencies).
