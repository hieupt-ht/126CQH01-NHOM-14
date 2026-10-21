# 126CQH01-NHOM-14

## Setup

Yêu cầu Node.js 20.19+ và npm.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy tại http://localhost:5173 và proxy `/api` tới backend `http://localhost:3000`.

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend chạy tại http://localhost:3000. Endpoint kiểm tra tối thiểu: `GET /api/health`.

Build production:

```bash
cd frontend && npm run build
cd ../backend && npm run build && npm start
```
