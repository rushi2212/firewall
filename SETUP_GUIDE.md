# AI-Powered WAF - Complete Setup Guide

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Backend Setup](#backend-setup)
3. [FastAPI Setup](#fastapi-setup)
4. [Frontend Setup](#frontend-setup)
5. [Running the Complete System](#running-the-complete-system)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+
- **MongoDB** (local or cloud)

### Installation Order

1. Backend (Node.js/Express)
2. FastAPI (ML Models)
3. Frontend (React)

---

## 🔧 Backend Setup

### 1. Navigate to backend directory

```bash
cd backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create `.env` file:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/waf
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FASTAPI_URL=http://localhost:8000
```

### 4. Start MongoDB

```bash
# Windows (if installed as service)
net start MongoDB

# macOS/Linux
mongod --config /usr/local/etc/mongod.conf
```

### 5. Start backend server

```bash
npm start
```

Backend should be running on `http://localhost:5000`

---

## 🤖 FastAPI Setup

### 1. Navigate to FastAPI directory

```bash
cd FastApi
```

### 2. Create virtual environment

```bash
python -m venv venv

# Activate
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Verify models are present

Ensure these files exist:

- `BiLstm/bilstm_payload_detector.h5`
- `BiLstm/tokenizer.json`
- `BiLstm/word_index.json`
- `XSS/xss_bilstm_model.h5`
- `User_Behaviour/behavior_lstm_model.h5`
- `bot detection/` (model files)

### 5. Start FastAPI server

```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

FastAPI should be running on `http://localhost:8000`

### 6. Verify endpoints

Open browser: `http://localhost:8000/docs`

You should see 5 service endpoints:

- `/bilstm/predict`
- `/bot/predict`
- `/behaviour/predict`
- `/xss/predict`
- `/feature/extract_features`

---

## 🎨 Frontend Setup

### 1. Navigate to frontend directory

```bash
cd frontend
```

### 2. Install dependencies

```bash
npm install
```

Required packages:

- react-router-dom
- recharts
- axios

If `npm install` doesn't install them automatically, run:

```bash
npm install react-router-dom recharts axios
```

### 3. Configure environment (optional)

Create `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Start development server

```bash
npm run dev
```

Frontend should be running on `http://localhost:5173`

---

## ▶️ Running the Complete System

### Terminal 1: MongoDB

```bash
# Start MongoDB service
mongod
```

### Terminal 2: Backend

```bash
cd backend
npm start
```

### Terminal 3: FastAPI

```bash
cd FastApi
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # macOS/Linux

uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 4: Frontend

```bash
cd frontend
npm run dev
```

### Access Points

- **Frontend Dashboard**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **FastAPI Docs**: http://localhost:8000/docs
- **MongoDB**: mongodb://localhost:27017

---

## 🧪 Testing

### 1. Test FastAPI Models

#### Test BiLSTM

```bash
curl -X POST http://localhost:8000/bilstm/predict \
  -H "Content-Type: application/json" \
  -d '{"payload": "'\'' OR '\''1'\''='\''1'\'' --"}'
```

#### Test XSS

```bash
curl -X POST http://localhost:8000/xss/predict \
  -H "Content-Type: application/json" \
  -d '{"payload": "<script>alert(\"XSS\")</script>"}'
```

### 2. Test Backend Orchestration

```bash
curl -X POST http://localhost:5000/api/decision/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "192.168.1.100",
    "payload": "'\'' OR '\''1'\''='\''1'\'' --"
  }'
```

### 3. Test Frontend

1. Open http://localhost:5173
2. Navigate to **Test Payload** page
3. Use quick test payloads:
   - SQL Injection: `' OR '1'='1' --`
   - XSS Attack: `<script>alert("XSS")</script>`
   - Normal Request: `user_id=123&action=view`

### 4. Verify Override Logic

Test high-confidence threat (should auto-block):

```bash
curl -X POST http://localhost:5000/api/decision/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "ip": "10.0.0.1",
    "payload": "<script>document.cookie</script>"
  }'
```

Expected: `decision: "block"` with `overrideReason` in response

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error: `Cannot find module`**

```bash
cd backend
npm install
```

**Error: `MongoDB connection failed`**

- Verify MongoDB is running: `mongosh` or `mongo`
- Check connection string in `.env`

### FastAPI Won't Start

**Error: `No module named 'tensorflow'`**

```bash
pip install tensorflow>=2.10.0
```

**Error: `Model file not found`**

- Verify model files exist in subdirectories
- Check paths in `app.py`

**Error: `Port 8000 already in use`**

```bash
# Kill existing process
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8000 | xargs kill -9
```

### Frontend Won't Start

**Error: `Cannot find module 'react-router-dom'`**

```bash
npm install react-router-dom recharts axios
```

**Error: `CORS policy blocked`**

- Ensure backend has CORS enabled
- Check `backend/server.js` for `cors()` middleware

**Error: `API calls failing`**

- Verify backend is running on port 5000
- Check browser console for errors
- Update API URL in Settings page

### Charts Not Rendering

**Issue: Empty charts on Dashboard**

- Wait for auto-refresh (5 seconds)
- Check browser console for errors
- Ensure `recharts` is installed:
  ```bash
  npm install recharts
  ```

### Models Not Loading

**Issue: FastAPI returns 500 errors**

- Check model file paths in `app.py`
- Verify Python version compatibility (3.8-3.10 recommended)
- Test models individually:
  ```bash
  cd BiLstm
  python test.py
  ```

---

## 📊 Health Check Commands

### Check all services are running

```bash
# Backend
curl http://localhost:5000/api/logs

# FastAPI
curl http://localhost:8000/docs

# Frontend (open in browser)
http://localhost:5173
```

### Monitor logs

```bash
# Backend logs
cd backend
npm start  # Watch terminal output

# FastAPI logs
cd FastApi
uvicorn app:app --reload --log-level debug

# Frontend logs
cd frontend
npm run dev  # Watch terminal + browser console
```

---

## 🔄 Restart All Services

```bash
# Stop all
# Press Ctrl+C in each terminal

# Restart in order
# Terminal 1: MongoDB
mongod

# Terminal 2: Backend
cd backend && npm start

# Terminal 3: FastAPI
cd FastApi && source venv/bin/activate && uvicorn app:app --reload

# Terminal 4: Frontend
cd frontend && npm run dev
```

---

## 📝 Notes

- **Development Mode**: All services use auto-reload/HMR for development
- **Production**: Build frontend with `npm run build` and serve with a static server
- **Database**: MongoDB stores logs in `logs` collection
- **Email Alerts**: Configure Gmail app password for email notifications
- **Model Updates**: Retrain models and replace `.h5` files, restart FastAPI

---

## ✅ Verification Checklist

- [ ] MongoDB running on port 27017
- [ ] Backend running on port 5000
- [ ] FastAPI running on port 8000
- [ ] Frontend running on port 5173
- [ ] FastAPI docs accessible at http://localhost:8000/docs
- [ ] Frontend dashboard loads at http://localhost:5173
- [ ] Test payload returns results with decision and threat score
- [ ] Logs appear in Dashboard and Logs page
- [ ] Auto-refresh works (check timestamp updates)

---

## 🎉 Success!

If all services are running and the checklist is complete, your AI-Powered WAF is ready to use!

Navigate to **http://localhost:5173** and start monitoring threats.
