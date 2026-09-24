# Local Resume Diff Viewer

A privacy-first local web app for comparing resume files across:

- `.docx -> .docx`
- `.docx -> .pdf`
- `.pdf -> .docx`
- `.pdf -> .pdf`

V1 compares extractable resume text, groups changes by resume section, maps common heading synonyms, flags resume-specific risks, and exports a local HTML report. It does not upload files, call AI APIs, require login, or support OCR.

## Run

One command starts the API, starts the UI, and opens the app in your default browser:

```powershell
.\run.cmd
```

Equivalent from any shell:

```powershell
npm.cmd start
# or: pwsh -File scripts\run-app.ps1
```

The launcher installs dependencies if `node_modules` is missing, waits for the API
`/api/health` to answer before starting Vite, waits for Vite before opening the browser, and
stops both services on Ctrl+C. A service that is already listening is reused, not restarted.
Useful switches:

```powershell
pwsh -File scripts\run-app.ps1 -NoBrowser                    # start both, do not open a browser
pwsh -File scripts\run-app.ps1 -ApiPort 4200 -ClientPort 5200
pwsh -File scripts\run-app.ps1 -Install                      # force npm install first
```

To drive the two services yourself instead (no health gating, no browser):

```powershell
npm.cmd install
npm.cmd run dev
```

Then open:

```text
http://localhost:5173
```

The React app runs on Vite and proxies comparison requests to the local Express API at `http://localhost:4174`.

## Test

Generate fake local resume fixtures:

```powershell
npm.cmd run fixtures
```

Run the four-pairing smoke test:

```powershell
npm.cmd run smoke
```

Build the production frontend:

```powershell
npm.cmd run build
```

Lint:

```powershell
npm.cmd run lint
```

## JD Diff mode

Switch to **JD Diff** at the top of the app to compare a resume (Input A) with a job description
(Input B). Each side accepts an uploaded `.docx`/text-based `.pdf` (same local parser as Resume Diff)
or pasted text. Every JD requirement is classified as `MATCH`, `PARTIAL`, `TRANSFERABLE`,
`HIDDEN_MATCH`, `GAP` or `CLAIM_RISK`, with the verbatim resume lines that support it, a reason and a
suggested action. There is no percentage or ATS score; the summary is counts only. The engine
(`server/jdDiffEngine.ts`) is local and deterministic. Details: `docs/jd-diff-prd.md` and
`docs/jd-diff-implementation-report.md`.

## V1 Caveats

- Supports modern `.docx` and text-based `.pdf` only.
- Scanned PDFs and image-only PDFs need OCR, which is deferred.
- Comparison is text-based, not pixel-perfect visual layout comparison.
- Resume format warnings are heuristic: `Pass`, `Warning`, or `Needs Review`, not a hard correctness judgment.
- PDF extraction can be noisy for columns, tables, text boxes, icons, and highly visual templates.
