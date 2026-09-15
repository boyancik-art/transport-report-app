# Codex task — Retail Cloudflare pixel-perfect

## SOURCE OF TRUTH
Use the approved screenshot committed at:

`docs/references/retail-approved-reference-codex.jpg`

This exact screenshot is the **visual source of truth**. Reproduce it 1:1. Do not redesign, reinterpret, simplify, invent a different hero, or substitute the composition.

## Only requested wording change
- Replace every visible category/type label `Retail` with **`Алко`**.
- Keep **`Холодний склад`** unchanged.

## Target
- Branch: `retail-cloudflare-preview`
- Cloudflare preview only; production must remain untouched.
- Native web implementation; no Flutter requirement.

## Pixel-match requirements
Match sidebar, WineTime logo placement, burgundy road decoration, header, hero truck + warehouse scene, typography, spacing, radii, borders, KPI cards, icons, three middle panels, bottom routes table, status pills, colors, shadows, and relative sizing.

The hero must visibly contain the burgundy WineTime truck, trailer, warehouse/loading docks and pallets exactly as composed in the reference. No generic icon, placeholder, empty hero, or alternative truck scene.

Date/time must be live, not hardcoded.

## Acceptance
At the reference desktop proportions, capture the implementation and compare directly with the reference. Target visual overlay parity; only minor browser/font rasterization differences are acceptable. Functional wiring follows after visual acceptance.