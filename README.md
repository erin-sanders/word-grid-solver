# Word grid solver

A mobile-friendly browser word-grid solver. Visit the website, enter letters,
and solve: no installation, login, extension, or account is required. The static
app and its bundled dictionary run entirely in your browser, with no solver
API or backend. Grid contents are not sent to a server.

**Website:** https://erin-sanders.github.io/word-grid-solver/

## Rules and usage

Choose a **3 x 3** or **4 x 4** grid. Enter **one or two English letters per
cell**, then press Solve. All cells must be filled. Clear empties the grid.

Start anywhere and move horizontally, vertically, or diagonally. Never reuse a
cell within a word; identical letters in different cells remain independently
usable. Two-letter segments are consumed together, in their displayed order:
`qu` contributes both letters and one visited cell, never `q`, `u`, or `uq`.

The default minimum is **5 total letters**, adjustable from 1 to 32. Results
are ranked by **number of cells visited**, not by character count. All distinct
matching words are returned, and ties are alphabetical. A word with multiple
paths retains one maximum-cell path. Each result shows both cell and letter
counts. Select it to see numbered cells and an accessible text path.

Tab moves between controls; arrow keys navigate grid cells, and Enter submits.
Editing the grid, grid size, or minimum clears old results and cancels any
outstanding worker so stale paths cannot reappear.

## Dictionary

The bundle contains **196,726 words**, exported from
[ESDB (formerly SCOWL)](https://github.com/en-wl/wordlist) at revision
`1e5b7d3a72f47a71da5d28686c1dd4b397178485`, size **80**. American and British
(-ise and -ize) spellings and US/GB/shared regional entries are included, with
variant levels 0 through 5. Inflections such as plurals and verb forms come
directly from the source database.

Size 80 is intended to cover uncommon words used in word games. It adds
**63,722 entries** over our original size-70 bundle without removing any existing
entries. Newly verified examples include `zyzzyva`, `zaxes`, `qat`, `qats`,
`abaser`, and `abasers`. Size 85's additional older or obsolete entries are
not included.

The export joins each word to its source lemma. **Both must already be ASCII
lowercase**; no names are blindly lowercased, and accented words are not
deaccented. It excludes source classes for names, possible names, surnames,
people, places, upper-case words, abbreviations, and trademarks, as well as
abbreviation/nonword/affix/multiword POS entries. Apostrophes, hyphens, spaces,
digits, and all other punctuation are rejected.

This conservative combination is necessary because ESDB explicitly warns that
its POS classes alone cannot reliably exclude proper nouns. For example,
`September` has no proper-name class, while `London` is tagged `upper`.
`rose`, `mark`, `will`, and `bill` survive through their independent lowercase
common-word senses, despite also having capitalized name entries. Probes for
these senses, inflections, dialect spellings, names, and abbreviations are
checked during export and in automated tests.

**Limitations:** ESDB is a spelling database, not every English word. Size 80
omits words beyond its size cutoff and can contain upstream errors. Capitalized-only common
adjectives and accented spellings are conservatively omitted. Inflections must
be attested in the database; the solver does not invent them. Some included
words may be informal, offensive, or adult language.

Word-list SHA-256:
`8f0ec5fd29b0cbc931d0fb518f77a40be8d215460c3d6c22b9e1a165c63b6964`.
The exact query, filtering choices, source probe evidence, count, revision,
and hashes are preserved in `public/dictionary-metadata.json`.

Copyright 2000-2026 by Kevin Atkinson

Permission to use, copy, modify, distribute, and sell any part of the English
Speller Database (ESDB, previously known as SCOWLv2), or word lists
created from it, is hereby granted without fee, provided that the above
copyright notice appears in all copies and that both the above copyright
notice and this notice appear in supporting documentation. Kevin Atkinson
makes no representations about the suitability of this database for any
purpose. It is provided "as is" without express or implied warranty.

The primary sources, 12dicts and ENABLE2K, are public domain; Alan Beale deserves
special credit. Complete upstream notices are retained unmodified in
`public/dictionary-license.txt` and linked from the website's dictionary page.

## Development and verification

Development requires Node.js 22.12+ and npm (website visitors do not).

```text
npm ci
npm test
npm run build
npm run dev
```

Browser checks run against a production build under `/word-grid-solver/`,
including mobile layout, keyboard entry, real dictionary loading, path display,
explicit failures, and cancellation:

```text
npx playwright install chromium
npm run test:browser
```

Solver tests cover adjacency, unsplittable segments, reuse, duplicate letters,
letter thresholds, maximum-cell paths, alphabetical ties, and all 16 cells / 32
letters. An independent exhaustive reference verifies controlled 3 x 3 and
4 x 4 grids. Dictionary tests verify hashes and filtering probes.

Vite builds the TypeScript application and browser worker into `dist`. A trie
prunes impossible prefixes during depth-first search. Results never truncate
ties, and dictionary/worker failures are shown as errors, not empty successes.

### Reproducing the dictionary

Clone `https://github.com/en-wl/wordlist` into a separate working folder, check
out the pinned revision above, and keep its tracked source files unmodified.
From that upstream checkout run:

```text
python -X utf8 combine.py create-db scowl.db
```

Then, from this repository:

```text
python scripts\export_dictionary.py C:\path\to\wordlist
```

On other platforms use the equivalent platform path. The exporter verifies the
revision and clean source state, runs the metadata-aware query and required
inclusion/exclusion probes, and writes the bundle, attribution, and metadata.
The bundled list is committed; builds and visitors need no upstream download.

## Hosting

`.github/workflows/pages.yml` builds and tests on pushes to `main`, then deploys
the static artifact to GitHub Pages using scoped Pages/OIDC permissions. In
repository Settings > Pages, select **GitHub Actions** as the deployment source.
Relative app assets support the project URL. No PR is required by this project.
