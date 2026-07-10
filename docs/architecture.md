# FlowPulse AI — System Architecture Overview

This document outlines the high-level system architecture and structural boundaries of **FlowPulse AI**.

---

## 1. Structural Boundaries & Layering
FlowPulse AI divides duties across decoupled modular boundaries:

```text
┌────────────────────────────────────────────────────────┐
│               React SPA (Presentation)                 │
│               - Feeds render directly onto Canvas      │
│               - Telemetry states read via Zustand     │
└──────────────────────────┬─────────────────────────────┘
                           │ Websockets (base64 + JSON) / REST (JSON)
┌──────────────────────────▼─────────────────────────────┐
│                 FastAPI Gateway (I/O)                  │
│                 - Manages client connection pools      │
│                 - Ticks signal states in lifespan      │
└──────────────────────────┬─────────────────────────────┘
                           │ In-process Queues
┌──────────────────────────▼─────────────────────────────┐
│                 AI & Pipeline Workers                  │
│                 - Captures raw video frames via Thread │
│                 - Evaluates vehicle tracks (YOLOv11)    │
└────────────────────────────────────────────────────────┘
```

1. **Presentation layer**: Serves UI templates using React and hooks. Connects to streams using thread-safe context endpoints.
2. **Gateway API layer**: Handles incoming commands, manages CORS policies, and validates JSON schemas using Pydantic.
3. **AI Pipeline layer**: Ingests camera streams, buffers frames in queues, and tracks bounding boxes.
4. **Data Access layer**: Coordinates SQLite database queries.

---

## 2. Shared Type Synchronization
To prevent duplicate interface declarations, all DTO structures, enums, and properties are defined in the central `/shared` folder. The React frontend maps its types directly to these definitions.
