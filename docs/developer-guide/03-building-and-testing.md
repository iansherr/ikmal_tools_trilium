# Building & Testing Suite

## Build Pipeline (`tools/build.mjs`)

The build pipeline compiles TypeScript sources and bundles artifacts using `esbuild`:

```bash
npm run build
```

This performs 3 steps:
1. Compiles `src/engine/` and `src/components/` via TypeScript (`tsconfig.build.json`) to `dist/`.
2. Bundles all 11 JS artifacts to `dist/artifacts/` using `esbuild` target ES2020.
3. Computes SRI SHA-256 hashes and updates `trilium-package.json`.

---

## Running Test Suites

Execute all test suites with a single command:

```bash
./tests/run_all.sh
```

### Test Suites Included:
1. **Node Unit & Engine Tests**: `node --test tests/*.test.mjs` (37 tests)
2. **ETAPI Client Tests**: `python3 -m unittest tests/test_etapi.py` (3 tests)
3. **Live Docker Instance E2E Smoke Tests**: `PYTHONPATH=. python3 tests/smoke_test_live_instance.py` (8 tests)

---

## Redeploying to Live Instance

To deploy updated artifacts to a live Docker Trilium instance (`http://localhost:38080`):

```bash
PYTHONPATH=. python3 tools/deploy_plugin_to_instance.py http://127.0.0.1:38080 test_smoke_token_12345
```
