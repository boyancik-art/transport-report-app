# Codex task — Retail Cloudflare pixel-perfect

## SOURCE OF TRUTH
Use the approved screenshot committed at:

`docs/references/retail-approved-reference-codex.jpg`

This exact screenshot is the **visual source of truth**. The implementation must reproduce it 1:1 as closely as technically possible. Do not redesign, reinterpret, simplify, invent a different hero, or substitute the composition.

## Only requested wording change
- Every visible category/type label `Retail` from the reference must become **`Алко`**.
- Keep **`Холодний склад`** exactly as shown.

## Target
- Branch: `retail-cloudflare-preview`
- Cloudflare preview project only.
- Do not modify production branch/project.
- Native web implementation; no Flutter requirement.

## Pixel-match requirements
Match the screenshot for sidebar, WineTime logo placement, burgundy road decoration, header, hero truck + warehouse scene, typography, spacing, radii, borders, KPI cards, icons, three middle panels, bottom routes table, status pills, colors, shadows, and relative sizing.

The hero must visibly contain the burgundy WineTime truck, trailer, warehouse/loading docks and pallets exactly in the visual composition of the reference. Do not use a generic icon, placeholder, empty panel, or a different truck scene.

Date/time in the header must be live rather than hardcoded.

## Acceptance
At the reference desktop proportions, capture the implemented page and compare it directly against `docs/references/retail-approved-reference-codex.jpg`. The goal is visual overlay parity, allowing only small browser/font rasterization differences. Functional data wiring follows after visual acceptance.