# Clarity Generator

Clarity Generator is a dependency-free web app that turns rough notes into a
clear brief. Paste scattered thoughts, meeting notes, or a draft update and the
app generates:

- A concise headline
- Audience-aware summary bullets
- Detected action items
- Open questions
- Practical clarity tips and a score

## Run locally

```bash
npm start
```

Then open <http://localhost:4173>.

## Test and build

```bash
npm test
npm run lint
npm run build
```

The production build is written to `dist/`.

## Project structure

```text
src/
  index.html     App shell
  styles.css     Interface styles
  app.js         Browser interactions
  clarity.js     Note analysis and brief generation logic
scripts/
  build.mjs      Static production build
  serve.mjs      Local development server
test/
  clarity.test.js
```
