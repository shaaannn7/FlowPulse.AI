# Product Requirement Document (PRD)
## Project Name: FlowPulse AI (Smart Traffic Control System)
**Document Version:** 1.0.0  
**Status:** Approved  
**Author:** Principal Software Architect

---

## 1. Executive Summary & Problem Statement

### 1.1 Problem Statement
Modern urban centers continue to rely on static, pre-programmed, timer-based traffic signal control systems. These systems are highly inefficient because they fail to adapt to live variations in traffic flow. Consequently, cities suffer from:
- **Excessive Delay and Gridlock**: Drivers waste an average of 54 hours per year stuck in traffic.
- **Environmental Impact**: Vehicle idling contributes heavily to greenhouse gas emissions and urban air pollution.
- **Emergency Service Delays**: Emergency response vehicles (ambulances, fire engines, police) frequently get trapped in gridlock, leading to delayed medical/incident responses.
- **Lack of Actionable Insights**: City administrators lack real-time visual telemetry and unified historical data to optimize traffic patterns and urban infrastructure planning.

### 1.2 The Solution: FlowPulse AI
FlowPulse AI is an edge-native, real-time, computer-vision-based Adaptive Traffic Signal Control (ATSC) system. It leverages state-of-the-art AI (YOLOv11) to inspect live video feeds from intersections, dynamically compute vehicle queue lengths, detect emergency vehicles, and optimize green light durations. All traffic metrics are streamed instantly to a centralized operator command center.

---

## 2. Target Users

| User Persona | Role / Context | Key Needs / Pain Points |
| :--- | :--- | :--- |
| **City Traffic Operator** | Commands the Traffic Operations Center (TOC). Monitors live intersections and manages anomalies. | Needs a reliable, low-latency live view of all intersections, instant emergency notifications, and manual override capabilities when physical incidents (accidents, construction) block lanes. |
| **Urban Planner / City Administrator** | Studies weekly/monthly traffic trends to propose infrastructure updates. | Requires historical reports on intersection throughput, average queue delays, classification distribution, and carbon savings trends. |
| **Emergency Dispatch Agent** | Routes emergency vehicles to hospitals and incidents. | Needs absolute assurance that traffic lights will dynamically transition to green (preemption) as emergency vehicles approach junctions. |

---

## 3. Product Goals

### 3.1 Business & Impact Goals
- **Minimize Delays**: Reduce average commuter wait times at optimized junctions by **25% to 40%**.
- **Priority Routing**: Achieve **100% preemption success** for emergency vehicles, clearing their pathways before arrival.
- **Environmental Impact**: Lower local carbon emissions at target intersections by minimizing vehicle idling.

### 3.2 System & Engineering Goals
- **Ultra-low Latency**: Telemetry updates must reflect on the operator dashboard within **150ms** of real-world changes.
- **Compute Efficiency**: The system must run at a minimum of **15 FPS** on mid-range GPU/CPU hardware configurations.
- **Modular & Extensible**: A clean split between stream capture, model inference, controller math, and WebSocket distribution.

---

## 4. Hackathon Value Proposition ("Winning the Jury")

To secure a victory in national-level hackathons, FlowPulse AI focuses on three key vectors:
1. **The "Wow" Factor UI**: An operator dashboard designed with high-end glassmorphism, featuring dynamic canvas overlays drawing bounding boxes on real-time base64 streams, animated timer wheels, and live-updating interactive maps.
2. **Deterministic Feasibility**: Bypassing complex training cycles by deploying YOLOv11 pre-trained weights tuned to transportation classes, ensuring high accuracy out of the box.
3. **Simulated Sandbox Integration**: A developer sidebar that lets judges trigger events (e.g., "Simulate Ambulance on Lane B", "Simulate Heavy Rush Hour on Northbound Lane") to instantly witness the backend algorithm adjust phase durations in real-time.

---

## 5. Feature Specifications

### 5.1 Core Features (P0 - Required for MVP)

#### 5.1.1 Real-Time Object Detection Pipeline
- **Description**: Frame-by-frame processing of camera feeds to detect, count, and classify vehicles.
- **Class Set**: Car, Truck, Bus, Motorcycle, Ambulance, Fire Truck, Police Car.
- **Telemetry Generated**: Vehicle counts per lane, active queue lengths, traffic density.

#### 5.1.2 Adaptive Signal Control (ATSC) Engine
- **Description**: The algorithmic brain adjusting traffic signal cycles dynamically.
- **Core Logic**: Lane queues determine priority weights. Lanes with high vehicle volumes receive longer green light allocations, bounded by configurable minimum and maximum thresholds (e.g., Min: 10s, Max: 60s).

#### 5.1.3 Emergency Vehicle Preemption (EVP)
- **Description**: Safety priority override.
- **Core Logic**: When an emergency vehicle is detected in a lane, the system interrupts the active cycle, safely transitions conflicting lights to red (using standard amber clearance rules), and triggers a green light for the emergency vehicle lane.

#### 5.1.4 Real-Time Dashboard (Operator View)
- **Description**: High-fidelity control center interface.
- **Core Views**:
  - Live video grid showcasing bounding boxes overlaid on the stream.
  - Active traffic phase indicators (Red, Yellow, Green countdowns).
  - Unified system metrics (total vehicles processed, system health/FPS, active alerts).

#### 5.1.5 Manual Override Control
- **Description**: Immediate manual command capacity.
- **Core Actions**: Operator can lock a signal in a specific phase (e.g., keep Northbound green during a parade) or trigger cycle changes manually.

---

### 5.2 Optional & Future Features (P1 / P2)

#### 5.2.1 "Green Wave" Coordination (P1)
- Coordinate adjacent intersections along a major corridor to ensure that a platoon of vehicles experiences a continuous wave of green lights.

#### 5.2.2 Predictive Traffic Forecasting (P2)
- Integrate a time-series prediction module (e.g., LSTM or Prophet) to forecast congestion peaks 1 hour in advance, allowing preemptive signal configuration.

#### 5.2.3 Carbon Footprint Reduction Estimator (P1)
- Real-time mathematical simulation calculating grams of CO2 saved based on the reduction in idle hours per vehicle.

---

## 6. User Stories & Acceptance Criteria

### User Story 1: Adaptive Phase Extension (Under High Congestion)
> **As a** Traffic Operator,  
> **I want** the system to automatically extend the green light phase for highly congested lanes,  
> **So that** traffic bottlenecks are cleared before gridlock locks the intersection.

- **Acceptance Criteria**:
  - **Given** the Northbound lane has 12 cars waiting (high congestion) and Eastbound has only 2 cars waiting (low congestion),
  - **When** the Northbound lane is green,
  - **Then** the ATSC engine should extend the Northbound green phase by calculating weights proportional to the queue length, up to a maximum limit of 60 seconds.
  - **Given** the Northbound green phase has reached its maximum threshold of 60 seconds,
  - **When** the time expires,
  - **Then** the light must cycle to yellow (3 seconds clearance) and transition to the next phase, preventing other lanes from starvation.

### User Story 2: Emergency Vehicle Preemption
> **As an** Emergency Dispatch Driver,  
> **I want** the traffic signals to turn green ahead of my arrival,  
> **So that** I do not lose critical minutes waiting at red lights.

- **Acceptance Criteria**:
  - **Given** an active traffic camera detects an `ambulance` or `fire_truck` class with a confidence score $> 0.75$,
  - **When** the detected vehicle is in a lane currently facing a red light,
  - **Then** the system must immediately trigger an `alert:emergency` event via WebSockets, flash a warning on the operator UI, and force a transition.
  - **Given** a transition is forced,
  - **When** executing the change,
  - **Then** the active green lane must undergo a standard 3-second yellow clearance phase before switching to red, followed by the emergency lane turning green immediately.
  - **Given** the emergency vehicle has cleared the intersection (no longer detected in frame for 5 consecutive frames),
  - **When** cleared,
  - **Then** the system must return to standard adaptive auto-control mode.

### User Story 3: Manual Operator Override
> **As a** Traffic Operator,  
> **I want** to manually take control of an intersection signal phase,  
> **So that** I can manage unscheduled physical blockages like road construction.

- **Acceptance Criteria**:
  - **Given** the operator is viewing the live dashboard,
  - **When** they toggle the control mode from `AUTO` to `MANUAL` and click the "Force Northbound Green" button,
  - **Then** the frontend must send an HTTP POST override command to the backend.
  - **Given** the backend receives the manual override,
  - **When** processing the request,
  - **Then** it must disable the ATSC algorithms, freeze the phase in the requested state, and broadcast a `signal:override` websocket event to all connected dashboards.
  - **Given** the operator clicks "Resume Auto Mode",
  - **When** received,
  - **Then** the system must restore algorithm control and resume the adaptive cycle.

---

## 7. Technical & Environmental Constraints

1. **Hardware Limitations**: During the hackathon demo, the system must run on a laptop (likely single GPU or CPU-only). Code must fall back gracefully to CPU inference (`device="cpu"`) and run compressed model weights (YOLOv11 Nano).
2. **Network Bandwidth**: High-resolution video streams cannot be piped directly over WebSockets to multiple remote dashboards. The backend must compress video frames to JPG (quality level ~60) and encode them to Base64, or use a local MJPEG endpoint.
3. **No Hardware Actuators (Simulation First)**: Since physical traffic light hardware is unavailable, the backend must simulate signal state machines (timers, phase transitions) entirely in software, emitting telemetry for the UI to render.

---

## 8. Success Metrics

| Metric | Target | Measurement Method |
| :--- | :--- | :--- |
| **Latency (Frame-to-Dashboard)** | $< 150\text{ms}$ | Timestamp logging of frame read vs. WebSocket render time. |
| **AI Class Accuracy (Precision/Recall)** | $\ge 85\%$ | Evaluation against a validation subset of transportation datasets. |
| **Simulated Congestion Reduction** | $\ge 30\%$ | Compare average vehicle wait times under static vs. adaptive modes in simulator. |
| **Emergency Transition Time** | $\le 4\text{s}$ | Duration from ambulance detection to target signal turning green. |

---

## 9. Developer Demo Flow (The Jury Walkthrough)

To ensure the demo runs flawlessly and makes a lasting impact on judges:

1. **Phase 1: Dashboard Overview**: Initialize the application. Show the live map, running nodes, and steady traffic streams. Point out the standard green/red cycle adapting dynamically but subtly.
2. **Phase 2: Congestion Simulation**: Click "Simulate Rush Hour" in the developer side-panel. Watch the vehicle queue grow on the Northbound lane. Observe the dashboard highlight the congestion score rising and watch the green light duration automatically scale up to handle the queue.
3. **Phase 3: Emergency Vehicle Preemption**: Click "Simulate Ambulance". The stream shows an ambulance approaching the junction. Instantly, an emergency banner flashes on screen, a siren alert sound plays, the active green phase transitions safely to red, and the ambulance lane turns green.
4. **Phase 4: Manual Control & Analytics**: Demonstrate manual control by putting the junction in `Manual` mode and toggling phases. Finally, navigate to the Analytics tab to show historical line charts tracking average delay reductions and carbon emission savings.

---

## 10. Future Scope & Roadmap (Beyond the MVP)

1. **Connected Infrastructure (V2X)**: Integrate with onboard vehicle systems (via cellular/DSRC) to predict arrivals before cameras see them, enabling early green phases.
2. **Multi-Agent Reinforcement Learning (MARL)**: Train decentralized agents representing each intersection. Allow adjacent signals to coordinate weights directly, resolving city-wide congestion holistically rather than just locally.
3. **Smart Camera Edge Clustering**: Enable nearby cameras to communicate metadata directly, forming a local mesh network that coordinates green lights along corridors.
