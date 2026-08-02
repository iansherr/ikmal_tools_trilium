# Contributing

Changes in this repository should remain specific to the Ikmal Tools package. Trilium host
infrastructure, the Plugins settings tab, and host-side tests belong in the separate
[Trilium repository](https://github.com/iansherr/Trilium), currently tested through
[`integration/plugins`](https://github.com/iansherr/Trilium/tree/integration/plugins).

Before submitting a change, run `npm run check`, `npm run build`, and `npm test`. Keep the
bundled `dist/artifacts` payloads, manifest paths, and SRI hashes synchronized. Host-side
changes should be made in the Trilium repository rather than copied here.
