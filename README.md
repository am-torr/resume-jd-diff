# Local Resume Diff Viewer

A privacy-first local web app for comparing resume files across:

- `.docx -> .docx`
- `.docx -> .pdf`
- `.pdf -> .docx`
- `.pdf -> .pdf`

V1 compares extractable resume text, groups changes by resume section, maps common heading synonyms, flags resume-specific risks, and exports a local HTML report. It does not upload files, call AI APIs, require login, or support OCR.

## Run

```powershell
npm.cmd install
npm.cmd run dev
```

Open:

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

## V1 Caveats

- Supports modern `.docx` and text-based `.pdf` only.
- Scanned PDFs and image-only PDFs need OCR, which is deferred.
- Comparison is text-based, not pixel-perfect visual layout comparison.
- Resume format warnings are heuristic: `Pass`, `Warning`, or `Needs Review`, not a hard correctness judgment.
- PDF extraction can be noisy for columns, tables, text boxes, icons, and highly visual templates.
