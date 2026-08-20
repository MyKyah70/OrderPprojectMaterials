# DESIGN.md: 3D Technology Services

## Source

- URL: https://www.3dtsi.com/
- Capture date: 2026-08-20
- Evidence: Firecrawl branding output and full-page screenshot

## Reference Screenshot

![Full-page screenshot of 3D Technology Services](./.firecrawl/3dtsi-full-page.png)

Use this screenshot as the visual source of truth for layout, hierarchy, density, and feel.

## Design Summary

Quiet, precise enterprise styling: large areas of white, charcoal typography, teal accents, square corners, hairline borders, and generous vertical rhythm. Editorial serif headings are paired with restrained sans-serif labels and controls.

## Design Tokens

### Colors

- Primary teal: `#0D9488` (observed)
- Deep teal: `#08786F` (inferred hover)
- Ink: `#1A1A2E` (observed)
- Muted text: `#6F7378` (inferred from screenshot)
- Pale surface: `#F7F9F9` (inferred)
- Field surface: `#F8F8F9` (observed)
- Hairline: `#E6E9E9` (inferred)
- Warning amber: `#DDAA28` (observed in site logo)

### Typography

- Display/headings: Cormorant or Georgia-style serif; elegant, high-contrast, sentence case.
- Body/controls: DM Sans/Inter-style sans serif; practical and quiet.
- Uppercase labels use wide tracking and small sizes.

### Spacing And Layout

- 4px base unit, 1180–1280px content container.
- Square corners and very light/no shadows.
- Form sections use 28–40px padding and clear horizontal rules.
- Dense tables become stacked cards on narrow screens.

## Components

- Primary buttons: teal fill, white uppercase label, square corners.
- Secondary buttons: white, ink text, teal-tinted border.
- Inputs: pale-gray fill, light border, no shadow, strong focus ring.
- Status choices: bordered selection cards with the selected card tinted.
- Section headings: small numbered eyebrow followed by a serif title.

## Page Patterns

- Slim dark/teal brand rail, then a white header.
- Editorial intro leads directly into a contained operational surface.
- Sticky progress/summary rail on desktop; single column on mobile.

## Content Style

Direct, calm, operations-focused. Labels are short. Supporting copy explains what purchasing needs without adding marketing language.

## Agent Build Instructions

Honor the existing brand rather than copying the public marketing page literally. Keep the form legible and efficient, use teal only for state and action, reserve amber/red for urgency, and preserve square geometry throughout.

## Rerun Inputs

workflow: firecrawl-website-design-clone  
source_url: https://www.3dtsi.com/  
target_stack: React / vinext  
output: DESIGN.md
