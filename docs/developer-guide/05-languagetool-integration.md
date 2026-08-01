# LanguageTool Integration & XML Rule Pack Specification

This document details the architecture of **LanguageTool for Trilium** (`iansherr/trilium-languagetool`) and its **Syntactic Conciseness XML Rule Generator**.

---

## Architecture Overview

```
trilium-languagetool/
├── src/
│   ├── engine/
│   │   └── languageToolEngine.ts   # Multi-endpoint HTTP client & fallback logic
│   └── artifacts/
│       └── trilium-languagetool.js # CKEditor status badge & suggestion popover
│
├── tools/
│   ├── generate_lt_rules.mjs       # Plain English & conciseness XML generator
│   └── setup/
│       └── main.go                 # Go CLI manager & LaunchAgent installer
│
└── rules/
    └── style_conciseness.xml       # 30+ generated LanguageTool XML rules
```

---

## Plain English XML Rule Schema

LanguageTool rules are compiled into official XML schema (`rules/style_conciseness.xml`) covering 4 primary rule categories:

1. **`WORDINESS`**: *"in order to"* → **"to"**, *"due to the fact that"* → **"because"**, *"at this point in time"* → **"now"**.
2. **`NOMINALIZATION`**: *"make a decision"* → **"decide"**, *"conduct an investigation into"* → **"investigate"**.
3. **`REDUNDANCY`**: *"advance planning"* → **"planning"**, *"end result"* → **"result"**.
4. **`CLARITY`**: *"has the capability to"* → **"can"**, *"utilize"* → **"use"**.

---

## Go Manager CLI Build

To compile the Go CLI manager binary:

```bash
go build -o bin/ikmal-languagetool tools/setup/main.go
```
