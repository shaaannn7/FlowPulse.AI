# FlowPulse AI — Smart Traffic Control System

FlowPulse AI is a high-performance, real-time Adaptive Traffic Signal Control (ATSC) platform. It leverages edge computer vision (YOLOv11) to analyze traffic camera streams, track vehicle count updates, prioritize emergency vehicle routing, and present real-time telemetry overlays in an interactive command dashboard.

---

## 1. System Requirements
- **OS**: Linux / macOS / Windows 11
- **Runtime**: Python 3.10+ (for backend), Node.js 18+ (for frontend)
- **Containerization**: Docker & Docker Compose (Optional, for containerized deployments)
- **Deep Learning Acceleration**: CUDA Toolkit compatible NVIDIA GPU (Optional, falls back to CPU)

---

## 2. Ports mapping

- **Frontend client**: `http://localhost:5173` (Vite dev server)
- **Backend API service**: `http://localhost:8001/api/v1` (Uvicorn server)
- **WebSocket Gateway**: `ws://localhost:8001/ws/{client_id}`

---

## 3. Running the Project

### 3.1 Local Development Environment Setup

#### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Initialize virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```
4. Start uvicorn:
   ```bash
   uvicorn app.main:app --reload --port 8001
   ```

#### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Vite dev server:
   ```bash
   npm run dev
   ```

### 3.2 Running via Docker Compose
To boot the entire stack in containerized production mode, execute the following command in the root folder:
```bash
docker-compose up --build
```
This launches the backend service on port `8001` and the React web server on port `5173`.
