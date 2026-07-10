# FlowPulse AI — Development & Contribution Guide

Welcome to the FlowPulse AI development workspace. Follow these coding standards and workflows to maintain consistency across the codebase.

---

## 1. Coding Standards

### 1.1 Python (Backend & AI)
- **Formatting**: Code formatting is enforced using **Black**. Max line length is set to 100.
- **Typing**: Use strict Python type annotations for all function signatures and properties.
- **Naming Conventions**:
  - Modules & packages: `snake_case` (e.g. `pipeline.py`).
  - Classes: `PascalCase` (e.g. `YOLO11Detector`).
  - Functions & variables: `snake_case` (e.g. `calculate_pressure()`).
- **Header Requirement**: Every Python module must include a header docstring explaining its exact purpose.

### 1.2 TypeScript & React (Frontend)
- **Formatting**: Formatting is managed by **Prettier** on every save.
- **Linter**: Rules are configured via **ESLint** (with `eslint-config-prettier` resolving rules conflicts).
- **Type Safety**: Strictly avoid `any` types. Make sure imports of types are marked with `import type`.
- **Component File Naming**: `PascalCase` (e.g. `AppShell.tsx`).

---

## 2. Directory Layout Rule
Future implementation phases must keep files within their specified boundaries:
- Put reusable hooks under `frontend/src/hooks/`.
- Put reusable layout shells under `frontend/src/layouts/`.
- Put database queries under `backend/app/db/repository.py`.
- Put AI interfaces under `backend/app/core/ai/`.
