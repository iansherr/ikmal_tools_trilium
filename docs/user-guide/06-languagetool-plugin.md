# LanguageTool for Trilium & Go Manager CLI

**LanguageTool for Trilium** (`iansherr/trilium-languagetool`) connects Trilium Notes' CKEditor note body editor to a local or remote LanguageTool server for real-time grammar, style, and spell checking.

---

## Key Features

1. **Real-Time Editor Checking**: Analyzes text as you type in Trilium Notes.
2. **Interactive Suggestion Popover**: Click the status bar badge (`⚠️ 2 issues`) to open an interactive popover menu displaying:
   - Specific grammar/spelling rule violation message.
   - Exact context snippet from your note.
   - Clickable 1-click replacement pills (`Fix: "a"`).
   - **"Ignore Rule"** button to suppress specific rule warnings for your session.
3. **Multi-Endpoint Fallback**: Automatically tries local fast server (`http://127.0.0.1:8081`) first, falling back to public API (`https://api.languagetool.org`) if offline.

---

## Standalone Go Manager CLI (`ikmal-languagetool`)

The standalone Go manager binary ([`iansherr/ikmal-languagetool`](https://github.com/iansherr/ikmal-languagetool)) automates local server setup:

```bash
# Build & run the 1-click manager
go build -o ikmal-languagetool main.go
./ikmal-languagetool
```

### What the Manager CLI Automates:
- **Environment Auto-Detection**: Finds Homebrew LanguageTool (`/opt/homebrew/bin/languagetool`), Docker, or standalone Java JRE.
- **FastText Model Auto-Downloader**: Auto-downloads Meta's FastText language identification model (`lid.176.bin`, 120MB) to `~/.ikmal-languagetool/models/`.
- **Syntactic Conciseness Rule Pack**: Mounts 30+ Plain English conciseness rules (`style_conciseness.xml`) compiled from PlainLanguage.gov, Vale, and proselint.
- **Background Daemon Installation**: Configures a persistent macOS LaunchAgent (`com.ikmal.languagetool.plist`) so LanguageTool runs silently in the background on boot on port 8081.

---

## Official LanguageTool Documentation References

- **[LanguageTool HTTP Server Specification](https://dev.languagetool.org/http-server)**
- **[LanguageTool Rule Syntax & XML Schema](https://dev.languagetool.org/rule-syntax)**
- **[LanguageTool Developer Overview](https://dev.languagetool.org/development-overview)**
- **[LanguageTool Conciseness & Writing Insights](https://languagetool.org/insights/post/conciseness-in-writing/)**
