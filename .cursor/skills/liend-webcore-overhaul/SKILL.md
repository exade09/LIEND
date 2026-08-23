---
name: liend-webcore-overhaul
description: >-
  Full LIEND visual overhaul to liquid glass modern webcore using durevpn.com as
  the webcore reference. Use when redesigning LIEND visuals, restyling the
  landing, matching durevpn, or when asked to keep only droplets and moving
  LIEND letters while replacing the rest of the UI.
disable-model-invocation: true
---

# LIEND visual overhaul

## User prompt (verbatim)

переделай все под визуал примерара который я тебе дал в liquid glass modern webcore стиле, + , оставь только капли текст который двигается , остальной визуал сократи и переделай ПОЛНОСТЬЮ, сохрани только логику но все остальное визуальное меняй, так же убери везде надписи demo и прочее даже если оно сейчас не работает, просто убери эти надписи перед этим скопируй и создай копию всего что уже сейчас было создано.

## Operating rules

1. Backup first. Copy current visual source into `_archive/pre-webcore-overhaul/` before editing. Do not overwrite that archive.
2. Keep logic. Do not change hooks, services, wallet flow, scroll math, or data adapters.
3. Keep only these hero mechanics:
   - Liquid curtain droplets (`useCurtainProgress`, `LiquidCurtain`) — droplets still travel down on scroll.
   - Moving LIEND letters (`useLetterField`, `Wordmark`) — do not touch `--dx/--dy/--rot/--sx/--sy`.
4. Do not put `filter` or `backdrop-filter` on the curtain, the letters, or any ancestor that would force those layers to re-rasterize every frame.
5. Cut every other decorative visual in the hero. No extra headlines, route rail, eyebrow pills, or supporting chrome over the droplets.
6. Rebuild every other surface to match https://durevpn.com/en as modern liquid glass webcore:
   - Desktop OS windows: double bevel, title bar, inset well, square window controls.
   - Silver/frosted chrome on a cobalt desktop, not cinematic near-black mush.
   - Neon green as the single live/buy accent (durevpn `buy` button).
   - Pixel + mono chrome typography.
   - Beveled raised/pressed controls.
7. Remove user-facing copy: `demo`, `DEMO`, `not live`, `demonstration`, `estimate only`, `not executable`, `mock`, `example route`, and equivalent disclaimers. Leave the data layer working.
8. Previous token-only CSS tweaks are not enough. The page must look like a different product, not a recolored one.
