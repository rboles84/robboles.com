# D3 License & Provenance

Source: D3 (https://d3js.org / https://github.com/d3/d3), by Mike Bostock.

## Vendored file

- File: `assets/vendor/d3/d3.v7.min.js`
- Upstream version: **7.9.0** (matches the D3 build the existing Magic Math visualizations were
  authored against — no API-level changes needed)
- Download source: `https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js`
- SHA-256: `f2094bbf6141b359722c4fe454eb6c4b0f0e42cc10cc7af921fc158fceb86539`
- Retrieved: 2026-07-18

This checksum is the defensible record that the vendored file hasn't silently changed. Re-download and
diff the checksum before bumping the version.

## License

D3 is distributed under the **ISC License** (not BSD-3-Clause), copyright Mike Bostock. Full text below,
fetched verbatim from `https://cdn.jsdelivr.net/npm/d3@7.9.0/LICENSE`:

```
Copyright 2010-2023 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

## Not the same dependency for every future story

D3 is the selected compatibility dependency for the six existing D3 stories, not a mandatory renderer
for every future Magic Math project. The Combo Orrery (a seventh completed visualization) uses
Three.js r0.185.1 instead — a separate future vendoring decision, out of scope here. Future stories may
use D3, native HTML/SVG/Canvas, Three.js, or another approved local dependency when the analytical and
visual requirements justify it; each new dependency gets its own architecture, licensing, performance,
and vendoring decision rather than being forced through D3 just because it was vendored first.
