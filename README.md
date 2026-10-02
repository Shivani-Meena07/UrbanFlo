# UrbanFlo

## Urban Flood Nowcasting & Decision Intelligence

> **Predicting Urban Inundation Before It Happens.**

UrbanFlo is an urban flood nowcasting and decision-support platform designed to predict **street-level urban flooding before it occurs**.

The platform combines real-time rainfall information, high-resolution terrain data, urban surface characteristics, drainage-network conditions, and downstream water levels to estimate **where flooding may occur, when it may occur, and how severe it may become**.

---

## 🚨 Problem Statement

Urban flooding is a recurring problem in cities such as **Mumbai, Delhi, and Chennai**.

Traditional Numerical Weather Prediction (NWP) systems primarily provide rainfall forecasts. However, rainfall alone does not determine whether a particular street will flood.

Urban flooding can be influenced by:

- Intense and localized rainfall
- Micro-topography and low-lying areas
- Impervious urban surfaces
- Limited drainage capacity
- Blocked or overloaded drains
- Underground drainage networks
- Open drains and canals
- River and tidal water levels
- Downstream drainage conditions

This creates a need for a system that can translate rainfall forecasts into **street-level flood intelligence** with a short lead time.

---

## 💡 Our Solution

UrbanFlo introduces a coupled urban flood intelligence framework that connects:

**Rainfall → Terrain → Surface Runoff → Drainage Network → Flood Prediction → Action**

Instead of only asking:

> "How much rain is expected?"

UrbanFlo aims to answer:

- **WHERE** will flooding occur?
- **WHEN** is it likely to occur?
- **WHY** is the location vulnerable?
- **HOW DEEP** could the water become?
- **WHAT SHOULD PEOPLE DO?**

The system continuously updates flood intelligence as new rainfall observations, drainage conditions, water levels, and incident reports become available.

---

## 🎯 Key Features

### 🌧️ Real-Time Rainfall Intelligence

UrbanFlo can integrate rainfall observations and forecast information from sources such as:

- Weather stations
- Airport observations
- Weather radar
- Rainfall nowcasts
- Short-term precipitation forecasts

This information is used to estimate rainfall intensity and spatial distribution.

---

### 🗺️ Street-Level Flood Prediction

UrbanFlo aims to provide high-resolution flood predictions for urban areas.

The prediction layer can represent:

- Flood-prone streets
- Expected water depth
- Flood onset time
- Flood duration
- Risk severity
- Prediction confidence

The target prediction horizon is:

**0–3 hours**

---

### ⛰️ Terrain & Urban Surface Analysis

The system incorporates geographic and urban characteristics including:

- High-resolution DEM
- Elevation
- Slope
- Low-lying regions
- Roads
- Impervious surfaces
- Land-surface characteristics
- Soil information
- Drainage catchments

These factors help determine how rainfall becomes surface runoff and where water is likely to accumulate.

---

### 🚰 Dynamic Drainage Network Model

UrbanFlo represents the urban drainage system as a graph.

#### Drainage Nodes

Nodes can represent:

- Manholes
- Drain inlets
- Junctions
- Pumping points
- Drainage outlets

#### Drainage Edges

Edges can represent:

- Underground pipes
- Open drains
- Canals
- Drainage channels

The model can estimate:

- Drainage capacity
- Flow through network segments
- Node stress
- Overcapacity
- Surcharge
- Potential backflow
- Drainage bottlenecks

---

### 🧱 Drainage Blockage Intelligence

Real-world drainage conditions can significantly affect flood risk.

UrbanFlo can incorporate reports from:

- Citizens
- Municipal authorities
- Field teams
- Disaster-management personnel

Examples include:

- Garbage accumulation
- Blocked drains
- Damaged drainage infrastructure
- Overflowing drains
- Waterlogging observations

These reports can be used to update drainage conditions and improve subsequent flood predictions.

---

### 🌊 River & Tidal Conditions

Where applicable, UrbanFlo can incorporate:

- River levels
- Canal levels
- Tidal conditions
- Downstream water levels

This is important because high downstream water levels can reduce drainage discharge and increase the probability of urban flooding.

---

### 🧠 Explainable Flood Intelligence

UrbanFlo is designed not only to predict flooding but also to explain **why** a location is at risk.

For example:

> Heavy rainfall + low elevation + high impervious surface + drainage node approaching capacity + downstream blockage

can result in a higher flood risk.

An example explanation could be:

```text
Road X
    ↓
72 mm/hr rainfall
    ↓
High impervious surface
    ↓
Low-lying terrain
    ↓
Drain D-17 at 94% capacity
    ↓
Downstream blockage detected
    ↓
Predicted water depth: 18–25 cm
    ↓
Estimated onset: 42 minutes

## System Architecture 

                  ┌─────────────────────┐
                  │ Weather / Radar     │
                  │ Data Sources        │
                  └──────────┬──────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │ Rainfall Nowcasting │
                  └──────────┬──────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │      Rainfall–Terrain–Drainage         │
        │            Coupling Engine             │
        └────────────────────┬───────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
     ┌─────────┐       ┌───────────┐      ┌───────────┐
     │   DEM   │       │   Urban   │      │ Drainage  │
     │ Terrain │       │  Surface  │      │  Network  │
     └─────────┘       └───────────┘      └───────────┘
                                                │
                                                ▼
                                      ┌─────────────────┐
                                      │ Dynamic Drainage│
                                      │  Digital Twin   │
                                      └────────┬────────┘
                                               │
                                               ▼
                                  ┌────────────────────────┐
                                  │ Street-Level Flood     │
                                  │ Prediction              │
                                  └───────────┬────────────┘
                                              │
                    ┌─────────────────────────┼──────────────────────┐
                    │                         │                      │
                    ▼                         ▼                      ▼
             ┌────────────┐          ┌──────────────┐       ┌──────────────┐
             │ Risk Map   │          │ Explainability│       │ Safe Routing │
             │ & Water    │          │ & Confidence │       │              │
             │ Depth      │          │ Engine        │       │              │
             └─────┬──────┘          └───────┬──────┘       └───────┬──────┘
                   │                         │                      │
                   └─────────────────────────┼──────────────────────┘
                                             ▼
                                  ┌─────────────────────┐
                                  │ UrbanFlo GIS         │
                                  │ Decision Dashboard  │
                                  └──────────┬──────────┘
                                             │
                                             ▼
                                  Alerts / Decisions / API

        Citizen & Authority Reports
                     │
                     └──────────────► Model Update

---

## 🚀 Quick Start / How to Run Locally

You can easily run UrbanFlo on your computer in **2 simple steps**.

### 📋 Prerequisites
- **Python 3.10+** (Python 3.11 recommended)
- **Node.js 18+** & **npm**

---

### Step 1: Start the Backend (FastAPI)

#### On Windows (PowerShell / Command Prompt):
```powershell
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python -m venv .venv

# 3. Activate virtual environment
.\.venv\Scripts\activate

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### On macOS / Linux:
```bash
# 1. Navigate to backend directory
cd backend

# 2. Create virtual environment
python3 -m venv .venv

# 3. Activate virtual environment
source .venv/bin/activate

# 4. Install backend dependencies
pip install -r requirements.txt

# 5. Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> **Backend is running at:** `http://localhost:8000`  
> **Interactive API Docs (Swagger):** `http://localhost:8000/docs`

---

### Step 2: Start the Frontend (React + Vite + Leaflet)

Open a **new terminal window** in the project root:

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install frontend dependencies
npm install

# 3. Start development server
npm run dev
```

> **Frontend is live at:** `http://localhost:5173`

---

## 🧪 Running Automated Tests

Run backend unit and integration tests (38 tests covering hydraulics, weather, routing, and APIs):

```bash
cd backend
.\.venv\Scripts\activate    # or source .venv/bin/activate on Linux/Mac
pytest
```

---

## 🗺️ Key Features Available

1. **Flood-Aware Real-World Navigation:**
   - Real Pan-India street driving routes via OSRM + OpenStreetMap.
   - Dynamic bottleneck detection (underpass sags turn deep glowing crimson red with stall risk tags).
   - Flood-safe elevated corridors (e.g. Barapullah, Eastern Freeway) with 100% dry elevation profiles.

2. **Vehicle Ground Clearance Switcher:**
   - Sedan (18cm stall limit)
   - SUV / 4x4 (34cm stall limit)
   - Two-Wheeler / Bike (14cm stall limit)
   - Bus / Commercial (48cm stall limit)

3. **💾 Saved Routes & Daily Commutes:**
   - One-tap route saving to local storage.
   - View, load, and drive saved routes directly from the Saved Routes drawer.

4. **Live Weather & Doppler Radar:**
   - Real-time rainfall precipitation telemetry (Open-Meteo & RainViewer).
   - No paid Google Maps API key required — 100% free and open-source stack.

5. **Community Driver Road Intel & Citizen Photo Reporting:**
   - Real-time road comments pinned directly onto the map by fellow drivers.
   - 1-tap instant water hazard ping and photo uploads.
