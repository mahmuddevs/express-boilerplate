# express-boilerplate

An Express + TypeScript boilerplate structured as a **modular monolith**, where each business feature lives in its own self-contained module and shared cross-cutting concerns live in a shared folder.

## Structure

```
src/
├── server.ts                 # Entry point (boots DB + HTTP server)
├── app.ts                    # Express app wiring (middleware, global error handler)
├── config/                   # Global configuration (env, database)
│   ├── env.ts
│   └── db-config.ts
├── modules/                  # Feature modules (self-contained: routes + controller + service + model + schema + middleware)
│   ├── index.ts              # Aggregates and mounts all module routers
│   ├── auth/
│   │   ├── auth.module.ts    # Module public API (router, services, middleware)
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── user.model.ts
│   │   ├── refresh-token.model.ts
│   │   ├── user.schema.ts
│   │   └── verify-auth.middleware.ts
│   └── root/
│       ├── root.module.ts
│       └── root.routes.ts
└── shared/                   # Shared, reusable code used across modules
    ├── middlewares/
    │   └── validate.middleware.ts
    ├── types/
    │   └── express.d.ts
    └── utils/
        ├── apiResponse.ts
        ├── hashUtils.ts
        ├── jwtUtils.ts
        ├── logger.ts
        └── queryBuilder.ts
```

## Adding a new module

1. Create a folder `src/modules/<name>/`.
2. Add your routes, controller, service, model, and schema inside it.
3. Create a `<name>.module.ts` barrel that exports the router.
4. Mount it in `src/modules/index.ts`:

```ts
import { Router } from "express";
import { authRoutes } from "./auth/auth.module.js";
import { rootRoutes } from "./root/root.module.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/", rootRoutes);

export default router;
```

## Getting Started

Install dependencies:

```bash
bun install
```

Run in development:

```bash
bun run dev
```

Build:

```bash
bun run build
```

Start the compiled output:

```bash
bun run start
```

This project was created using `bun init` in bun v1.3.1. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.