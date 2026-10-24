# Reproutes

Reproutes is a field-sales operations platform for managing sales agents, retailers, orders, inventory, factory fulfilment, live tracking, attendance, and mobile workflows.

## Repository layout

| Directory | Responsibility |
| --- | --- |
| `backend/` | Node.js API, authentication, business workflows, migrations, and tests |
| `manager/` | Manager portal for agents, retailers, orders, reports, and operations |
| `sales/` | Salesperson portal for visits, shops, orders, and field activity |
| `factory/` | Factory and dispatch portal |
| `mobile/` | Expo / React Native application for field and factory roles |

The portals are intentionally kept as separate applications while sharing the same backend API contracts.

## Development requirements

- Node.js 20 or newer
- npm 10 or newer
- MySQL-compatible database for the backend
- Environment files copied from each application's `.env.example`

## Local development

Install dependencies in the application you are working on, then use its scripts:

```bash
cd backend && npm ci
cd ../manager && npm ci && npm run dev
```

Available portal commands are documented in each portal's README. Do not commit `.env` files, generated builds, `node_modules`, or mobile build artifacts.

## Quality checks

Before opening a pull request, run the relevant checks:

```bash
cd backend && npm test
cd ../manager && npm run lint && npm run build
cd ../sales && npm run lint && npm run build
cd ../factory && npm run lint && npm run build
```

Database migrations live in `backend/migrations/` and must be reviewed together with the API changes that consume them.

## Git workflow

Use focused commits and pull requests. Never force-push `main`. Keep secrets out of Git, review migration safety, and verify the affected portal plus backend tests before merging.
