---
name: Atelier Structured Minimalism
colors:
  surface: '#f9f9f9'
  surface-dim: '#dadada'
  surface-bright: '#f9f9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f3'
  surface-container: '#eeeeee'
  surface-container-high: '#e8e8e8'
  surface-container-highest: '#e2e2e2'
  on-surface: '#1a1c1c'
  on-surface-variant: '#4c4546'
  inverse-surface: '#2f3131'
  inverse-on-surface: '#f1f1f1'
  outline: '#7e7576'
  outline-variant: '#cfc4c5'
  surface-tint: '#5e5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1b'
  on-primary-container: '#848484'
  inverse-primary: '#c6c6c6'
  secondary: '#6e5e00'
  on-secondary: '#ffffff'
  secondary-container: '#f8df71'
  on-secondary-container: '#736200'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c1b1b'
  on-tertiary-container: '#858383'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2e2e2'
  primary-fixed-dim: '#c6c6c6'
  on-primary-fixed: '#1b1b1b'
  on-primary-fixed-variant: '#474747'
  secondary-fixed: '#fbe273'
  secondary-fixed-dim: '#dec65a'
  on-secondary-fixed: '#211b00'
  on-secondary-fixed-variant: '#534600'
  tertiary-fixed: '#e5e2e1'
  tertiary-fixed-dim: '#c8c6c5'
  on-tertiary-fixed: '#1c1b1b'
  on-tertiary-fixed-variant: '#474746'
  background: '#f9f9f9'
  on-background: '#1a1c1c'
  surface-variant: '#e2e2e2'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
  table-data:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system is built for a high-end bespoke curtains and furniture business, emphasizing precision, craftsmanship, and luxury. The brand personality is **authoritative, architectural, and meticulous**. It balances the raw, geometric power seen in the circular logo with a refined, modern digital interface.

The visual style is **Corporate Modern with a Minimalist edge**. It uses heavy white space to mimic the airy feel of luxury fabrics, paired with high-contrast black elements that provide structural grounding. The aesthetic is "Atelier-digital"—functional enough for complex measurement data entry, yet elegant enough to showcase premium furniture collections.

Targeting interior designers and affluent homeowners, the UI evokes an emotional response of **trust and effortless sophistication**.

## Colors

The palette is rooted in the starkness of the black and white logo, enriched with an elegant "Champagne Gold" accent to signify premium quality.

- **Primary (Pitch Black):** Used for primary navigation, headings, and high-impact structural elements. It provides the "ink on paper" feel of traditional architectural blueprints.
- **Secondary (Champagne Gold):** A sophisticated metallic used sparingly for primary actions, active states, and premium status indicators. It breaks the monochrome to draw the eye to critical conversion points.
- **Tertiary (Deep Charcoal):** Used for body text and secondary icons to ensure high legibility without the harshness of pure black.
- **Neutral (Gallery White & Soft Gray):** The foundation of the UI. A slightly off-white background reduces eye strain during long data-entry sessions while maintaining a clean, gallery-like atmosphere.

## Typography

The typographic system prioritizes clarity and a structured "engineered" feel.

- **Headlines (Hanken Grotesk):** A sharp, contemporary Sans-serif that echoes the geometric precision of the logo. Use 'Display' sizes for landing pages and 'Headline' sizes for dashboard headers.
- **Body (Manrope):** A balanced, highly legible Sans-serif used for all long-form content, descriptions, and furniture specifications.
- **Technical Labels (JetBrains Mono):** A monospaced font used for measurements (e.g., 240cm x 150cm) and SKU numbers. This creates a visual distinction between descriptive text and technical data, crucial for fabric and furniture ordering.

## Layout & Spacing

The layout utilizes a **12-column fixed grid** for desktop to ensure data-heavy tables and forms remain readable and aligned.

- **Grid System:** 12 columns on desktop, 8 on tablet, and 4 on mobile. 
- **The "Technical Ribbon":** For furniture measurements and fabric selection, use a secondary internal grid (4-column layout within a card) to organize input fields (Width, Height, Pleat Type, Fabric Code).
- **Rhythm:** An 8px base unit is used for all padding and margins. Use generous whitespace (48px+) between major content sections to maintain the premium, uncluttered brand feel.
- **Tables:** Designed with a "comfortable" density. Row heights should be 56px minimum to allow for clear separation of data points.

## Elevation & Depth

Visual hierarchy is established through **Tonal Layers and Low-Contrast Outlines** rather than aggressive shadows.

1. **Base:** Neutral (#F8F8F8) background.
2. **Surface:** Pure White (#FFFFFF) containers for forms, tables, and product cards.
3. **Boundaries:** 1px solid borders in a very light gray (#E0E0E0) define technical areas without adding visual weight.
4. **Active Elevation:** Only the primary "Action" cards (e.g., a selected fabric) receive a soft, low-opacity shadow (0px 4px 20px rgba(0,0,0,0.05)) to suggest it is being interacted with.

## Shapes

The shape language is **Soft (0.25rem)**. 

While the logo contains sharp triangular points, the UI uses subtle rounding to provide a modern, "tailored" feel—much like the soft edges of upholstered furniture. 
- Buttons and Input Fields: 4px (rounded-sm) for a crisp, architectural look.
- Status Badges and Chips: Fully pill-shaped to contrast against the structured grid of the forms.
- Image Containers: Use 8px (rounded-lg) to soften high-resolution photography of fabrics and rooms.

## Components

### Buttons
- **Primary:** Solid black background with white text. High contrast, sharp 4px corners.
- **Secondary:** Transparent with a 1px black border.
- **Accent:** Gold background for "Request Quote" or "Place Order."

### Forms & Data Entry
- **Inputs:** Square-ish, 1px bordered boxes. Labels should use the `label-caps` typography (JetBrains Mono) placed above the input field.
- **Measurement Units:** Integrated suffixes (cm, in, m) should be styled in a muted gray inside the input field.

### Tables (Inventory & Orders)
- **Header:** Light gray background (#F2F2F2) with uppercase, monospaced labels.
- **Row Hover:** Shift background to a very faint gold tint to indicate interactivity.

### Status Badges
- **Draft:** Gray background, dark gray text.
- **Processing:** Gold border, gold text.
- **Delivered:** Black background, white text.

### Product/Fabric Cards
- Use a 1:1 aspect ratio for fabric swatches. 
- Include a "Quick Add" floating button that appears on hover, using the Gold accent color.