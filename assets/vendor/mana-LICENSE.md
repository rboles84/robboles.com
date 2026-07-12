# Mana Font License

Source: Mana v1.18.0 (https://github.com/andrewgioia/mana), by Andrew Gioia.

Mana is made up of different parts, each carrying its own license.

## Individual licenses and commentary

* Symbol imagery: Copyright Wizards of the Coast (https://magicthegathering.com).
All mana, tap, and card-type symbol images are trademarks/copyright of Wizards of the Coast. Mana's
glyphs are distributed for the purpose of identifying Magic: the Gathering game mechanics, mana, and
card types — not as an endorsement by or of Wizards of the Coast.

* Fonts: SIL Open Font License 1.1 (https://scripts.sil.org/OFL).
The prepared font files distributed in Mana (the web/desktop glyph files) carry the SIL OFL 1.1
license. This includes `mana.woff2`, `mana.woff`, and `mana.ttf` as vendored in this repo under
`assets/fonts/`.

* CSS, LESS, and Sass: MIT License (https://opensource.org/licenses/mit-license.html).
The MIT license applies to `mana.css` and the LESS/Sass source it's built from. The vendored
`assets/css/mana.css` in this repo is the unmodified upstream stylesheet (only the `@font-face` src
list is trimmed to the local font files actually shipped here).

## Attribution

Minimal attribution is required by the SIL OFL that the fonts are distributed under. The vendored
files already carry an attribution header pointing back to this file and to the upstream project.
