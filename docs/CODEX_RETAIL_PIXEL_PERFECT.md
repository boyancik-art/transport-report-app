# Codex task — Retail Cloudflare pixel-perfect

## SOURCE OF TRUTH
Use the approved screenshot committed at:

`docs/references/retail-approved-reference-codex.jpg`

This image is the **visual source of truth**. Reproduce the page 1:1 as closely as technically possible. Do not redesign, reinterpret, simplify, or substitute the composition.

## Only requested wording change
- Every UI occurrence/category label `Retail` in the reference must become **`Алко`**.
- Keep **`Холодний склад`** unchanged.

## Target
- Branch: `retail-cloudflare-preview`
- Cloudflare preview project only.
- Do not modify production branch/project.
- Native web implementation (HTML/CSS/JS is fine); no Flutter requirement.

## Pixel-match requirements
Match the reference for sidebar, logo placement, road decoration, header, hero truck + warehouse scene, typography, spacing, radii, borders, KPI cards, icons, three middle panels, tables, status pills, colors, shadows, and relative sizing.

The hero must visibly contain the burgundy WineTime truck, trailer, warehouse/loading docks and pallets as shown in the reference. Do not replace it with a generic icon/placeholder.

Date/time in the header must be live rather than hardcoded.

## Acceptance
At desktop reference proportions, a screenshot of the implemented page should visually overlay the source-of-truth screenshot with only small rendering/font differences. Functional data wiring can follow after visual acceptance.