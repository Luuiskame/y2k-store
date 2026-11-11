# Fonts of the admin's type sets

Self-hosted so the admin makes no third-party request and the Home Screen app
has them offline. Declared in `../theme.css`; which set uses which is in
`../palettes.ts` (`FONT_SETS`).

Every file is the **latin** subset (it covers Spanish) in WOFF2, as packaged by
[Fontsource](https://fontsource.org) and downloaded from its CDN on 2026-11-11
(`https://cdn.jsdelivr.net/fontsource/fonts/<id>…`). The `-wght` files are
variable fonts: one file holds every weight.

| File | Family | Weights | Copyright |
|---|---|---|---|
| `cinzel-latin-wght.woff2` | Cinzel | 400–900 | The Cinzel Project Authors |
| `manrope-latin-wght.woff2` | Manrope | 200–800 | The Manrope Project Authors |
| `unbounded-latin-wght.woff2` | Unbounded | 200–900 | The Unbounded Project Authors |
| `space-grotesk-latin-wght.woff2` | Space Grotesk | 300–700 | The Space Grotesk Project Authors |
| `big-shoulders-display-latin-wght.woff2` | Big Shoulders Display | 100–900 | The Big Shoulders Project Authors |
| `jetbrains-mono-latin-wght.woff2` | JetBrains Mono | 100–800 | The JetBrains Mono Project Authors |
| `instrument-serif-latin-400.woff2`, `…-400-italic.woff2` | Instrument Serif | 400 | The Instrument Serif Project Authors |
| `unifrakturmaguntia-latin-400.woff2` | UnifrakturMaguntia | 400 | j. 'mach' wust, Peter Wiegel |

## License

All eight families are published under the
[SIL Open Font License, Version 1.1](https://openfontlicense.org/open-font-license-official-text/),
which allows using, embedding and redistributing them, also commercially, as
long as they are not sold on their own and this notice travels with them.

## Adding or changing one

1. Download the latin WOFF2 from Fontsource (variable if there is one).
2. Put it here and declare it in `theme.css` with `font-display: swap`.
3. Name it in a `FontSet` in `palettes.ts`.
4. Add its row above. Only add fonts whose license allows redistribution.

The build gives each file a hashed name, so replacing one needs no cache
busting (unlike `src/admin/public`, which is served as-is for a year).
