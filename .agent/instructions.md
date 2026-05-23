# 🤖 AI Agent System Instructions & Guidelines

Welcome! You are an AI assistant working on the AutoFlow & AI Space codebase. To maximize token efficiency and prevent database/logic errors, you MUST adhere to the following guidelines:

---

## 🧭 1. Read the Master Map FIRST
Before searching or viewing numerous source files in the repository:
1. Read the master codebase reference: [CODEBASE_MAP.md](file:///e:/AUTOFLOW/DOMATION_FULLSTACK/DOMATION_FULLSTACK/DOMATION_FULLSTACK/CODEBASE_MAP.md)
2. This map provides the overall directory tree, database tables, and critical coding rules. Reading this single file establishes immediate context, saving thousands of tokens.

---

## 🔄 2. Keep the Map Sync'd
Whenever you introduce changes to this repository:
1. **Adding Files**: Add new files to the directory layout and API section in `CODEBASE_MAP.md`.
2. **Modifying Logic**: Update any structural or system logic descriptions.
3. **Database Migration**: Record any sql migration files or added database tables/columns under the Database Schema section of `CODEBASE_MAP.md`.
4. Update `CODEBASE_MAP.md` at the end of your task to keep it as the single source of truth.

---

## 🛡️ 3. Follow Concurrency & Reliability Rules
Strictly adhere to the patterns documented in [CODEBASE_MAP.md#7-critical-coding-patterns--concurrency-guards](file:///e:/AUTOFLOW/DOMATION_FULLSTACK/DOMATION_FULLSTACK/DOMATION_FULLSTACK/CODEBASE_MAP.md#7-critical-coding-patterns--concurrency-guards):
- **Database JSON Updates**: Wrap columns in `COALESCE(NULLIF(col, ''), '{}')` before calling `JSON_SET`.
- **Row Locking & Indexing**: Use indexes and `SKIP LOCKED` in parallel queue workers.
- **Vietnamese Encoding**: Reuse global DSN on DB reconnect to protect encoding.
- **Session File Blocking**: Call `session_write_close()` early in concurrent requests.
- **Placeholder Limits**: Chunk large database array filters/deletes into groups of 500.
- **Secure IDs**: Always use cryptographically secure bytes (`bin2hex(random_bytes(16))`) instead of `uniqid()`.
- **Authentication separation**: Keep AutoFlow (`users`) and AI Space (`ai_org_users`) session states isolated.
