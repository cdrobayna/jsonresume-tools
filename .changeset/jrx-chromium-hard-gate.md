---
"jsonresume-execute": patch
---

`jrx check --theme`/`jrx all --theme` no longer refuse to run when no system Chromium/Chrome is
found on `PATH`. Previously this was a hard gate that blocked `resume-cli`'s own Puppeteer from
resolving its bundled/downloaded Chrome — the exact thing that lets `resume export` work
standalone with zero configuration. Now `check`/`all` only override
`PUPPETEER_EXECUTABLE_PATH`/`RESUME_PUPPETEER_NO_SANDBOX` when a system Chromium is explicitly
found (via `PUPPETEER_EXECUTABLE_PATH` or `PATH`); otherwise `resume-cli` gets an unmodified
environment and resolves Puppeteer's own Chrome itself.

`jrx doctor` also now falls back to probing resume-cli's own Puppeteer `executablePath()` when no
system Chromium is found, so it reports `✓ Chromium/Chrome ... (Puppeteer-managed)` instead of a
misleading `✗` in that case.
