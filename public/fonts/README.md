# Offline web fonts

These fonts are vendored build inputs for the Android WebView. They are
redistributed under the SIL Open Font License recorded in `licenses/`.

## Provenance

- Retrieved: 2026-07-24
- Upstream repository: <https://github.com/google/fonts>
- Upstream revision:
  `9fab8b6cc7b2f20376914fd765d918c698c66d75`
- Source tree: `ofl/<family>/` at the revision above

| Family | Style | Upstream version | WOFF2 file | WOFF2 SHA-256 | Source TTF and SHA-256 |
| --- | --- | --- | --- | --- | --- |
| Silkscreen | Regular | 1.001 | `Silkscreen-Regular.woff2` | `a8509db65e47b89daa545d8c9e0b4ffaf0e153fa19d754ec9d4a3a13878d77a9` | [Silkscreen-Regular.ttf](https://raw.githubusercontent.com/google/fonts/9fab8b6cc7b2f20376914fd765d918c698c66d75/ofl/silkscreen/Silkscreen-Regular.ttf), `c845473330b94c2079ce9af01c51ac8ba2d99c24f4d14c039843bbb8e642ebd8` |
| Silkscreen | Bold | 1.001 | `Silkscreen-Bold.woff2` | `eb1e8471d5e81886e7bd12ea8bcd2564d27f3e3dddb7820a25c034b5afd7bf4e` | [Silkscreen-Bold.ttf](https://raw.githubusercontent.com/google/fonts/9fab8b6cc7b2f20376914fd765d918c698c66d75/ofl/silkscreen/Silkscreen-Bold.ttf), `768476aa712d4f5c3e18d3bce80f980a8bd3f72b7094d22ec5e768df3acfed61` |
| VT323 | Regular | 2.000 | `VT323-Regular.woff2` | `2f89690e3eabbc381036c80af468fdb0793a0816da323284c8e690cb079e1c3b` | [VT323-Regular.ttf](https://raw.githubusercontent.com/google/fonts/9fab8b6cc7b2f20376914fd765d918c698c66d75/ofl/vt323/VT323-Regular.ttf), `cf4de751ada78ceac033dbe16a687742939995b77bc2a052ae17a4957958594d` |
| DotGothic16 | Regular | 1.100 | `DotGothic16-Regular.woff2` | `ba8513004fcb6c03c831d7eefd7fffe457426346820054a2481c278076796b32` | [DotGothic16-Regular.ttf](https://raw.githubusercontent.com/google/fonts/9fab8b6cc7b2f20376914fd765d918c698c66d75/ofl/dotgothic16/DotGothic16-Regular.ttf), `3ad9af88726d42b40f7f365f0dcac785af73cf20ea6f1d5b44e57cc21150b8f1` |

The license wording is copied from the same revision. Vendored copies use LF
line endings and omit upstream trailing whitespace:

- [Silkscreen OFL](https://raw.githubusercontent.com/google/fonts/9fab8b6cc7b2f20376914fd765d918c698c66d75/ofl/silkscreen/OFL.txt):
  `0c0defe44c565904cdd3037f41254b55cb93e5999d4ff13c6c682f69d4c1c0a4`
- [VT323 OFL](https://raw.githubusercontent.com/google/fonts/9fab8b6cc7b2f20376914fd765d918c698c66d75/ofl/vt323/OFL.txt):
  `27d9af34210253e7ca1251fbace86c6f65b40031d6ce1a75493a1b2093631298`
- [DotGothic16 OFL](https://raw.githubusercontent.com/google/fonts/9fab8b6cc7b2f20376914fd765d918c698c66d75/ofl/dotgothic16/OFL.txt):
  `13cd62e1bdf8e627fb596d2709c3a8f3a53ff0753ce36c6c71e48fa6c6112eb4`

## Conversion

The full upstream TTF files were converted without subsetting:

```bash
python3 -m venv /tmp/fridge-font-tools
/tmp/fridge-font-tools/bin/pip install 'fonttools[woff]==4.59.0'
/tmp/fridge-font-tools/bin/fonttools ttLib.woff2 compress <source>.ttf -o <output>.woff2
```

Application CSS must refer to these files with relative URLs so it remains
compatible with Vite `base: "./"` and Android asset hosting. User-authored and
device-provided text must retain a system-font fallback for glyphs that these
families do not contain.
