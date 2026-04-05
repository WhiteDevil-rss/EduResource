# Design System Strategy: The Academic Luminary

## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **"The Digital Curator."** 

Moving away from the standard "learning management system" aesthetic, this system treats educational content like a high-end digital gallery. It balances the weight of academic authority with the ethereal, cutting-edge feel of modern technology. We achieve this through **Intentional Asymmetry**—where large-scale typography anchors the page while glassmorphic elements float with a sense of weightlessness. We break the grid by allowing images and secondary cards to overlap container boundaries, creating a sense of depth and curated "layers of knowledge."

## 2. Color & Atmospheric Depth
This system rejects the flat, "safe" dark mode in favor of a deep, multi-dimensional atmosphere using the `surface` tokens.

*   **The "No-Line" Rule:** Explicitly prohibit 1px solid borders for sectioning. Structural separation is achieved through tonal shifts. For example, a main content area (`surface`) transitions into a sidebar or secondary module using `surface-container-low` (#11131d).
*   **Surface Hierarchy & Nesting:** Treat the UI as a physical stack.
    *   **Base:** `background` (#0c0e17)
    *   **Sectioning:** `surface-container` (#171924)
    *   **Interactive Cards:** `surface-container-high` (#1c1f2b)
    *   **Floating Modals:** `surface-container-highest` (#222532)
*   **The Glass & Gradient Rule:** For "Hero" moments or high-level academic resources, use Glassmorphism. Apply `surface_variant` at 40% opacity with a `backdrop-blur` of 20px. 
*   **Signature Textures:** Main CTAs must use a linear gradient from `primary` (#b6a0ff) to `primary_dim` (#7e51ff) at a 135-degree angle. This provides a "glow" that flat colors cannot replicate, mimicking the light of a digital screen in a dark study.

## 3. Typography: The Editorial Voice
We utilize a high-contrast scale to separate "Research/Data" from "Experience/Interface."

*   **The Serif-Sans Dialogue:** We pair **Manrope** (Display/Headline) with **Inter** (Body/UI). Manrope’s geometric yet open nature feels "Academic Tech," while Inter provides the precision needed for dense educational resources.
*   **Display-LG (3.5rem):** Reserved for page headers and "Hero" statements. Use `-0.04em` letter spacing for a tight, editorial feel.
*   **Title-SM to Title-LG:** Used for resource titles. These should always be high-contrast (`on_surface` #f0f0fd) to ensure authority.
*   **Labels:** Use `label-md` in `primary` (#b6a0ff) with all-caps and 0.1em letter spacing for metadata (e.g., "COURSE MODULE" or "RESOURCE TYPE").

## 4. Elevation & Depth
In this system, elevation is a feeling, not a shadow.

*   **Tonal Layering:** Avoid shadows for static elements. If a card needs to stand out, place a `surface-container-highest` element on top of a `surface` background. The subtle shift from #222532 to #0c0e17 is enough to signal hierarchy.
*   **Ambient Shadows:** For floating elements (Popovers/Tooltips), use a "Deep Bloom" shadow: `0px 24px 48px rgba(0, 0, 0, 0.4)`. The shadow should feel like it’s absorbing light, not just casting it.
*   **The "Ghost Border" Fallback:** If a container requires a boundary (e.g., inside a dense data table), use `outline_variant` (#464752) at **15% opacity**. It should be felt, not seen.
*   **Glassmorphism Depth:** When using glass containers, apply a 1px inner-stroke using `outline` (#737580) at 10% opacity on the top and left sides only. This creates a "specular highlight" that makes the glass feel real.

## 5. Components

### Buttons
*   **Primary:** Gradient fill (`primary` to `primary_dim`), `rounded-md` (0.75rem), `on_primary` text. No border.
*   **Secondary:** Glassmorphic. Background `surface_variant` at 20% opacity with a `backdrop-blur`. 
*   **Tertiary:** Text-only in `secondary` (#00affe). Use for low-priority navigation.

### Cards & Resource Items
*   **The Rule:** Forbid divider lines between list items. Use `spacing-4` (1.4rem) of vertical white space to define content blocks.
*   **Hover State:** Cards should transition from `surface-container-high` to `surface-container-highest` with a subtle scale of 1.02.

### Input Fields
*   **State:** Use `surface_container_lowest` (#000000) for the field background to create a "recessed" look. 
*   **Focus:** Transition the "Ghost Border" from 15% opacity to 100% `primary` (#b6a0ff).

### Academic Progress Chips
*   Use `secondary_container` (#006493) with `on_secondary_container` text. The vibrant blue signals "active growth" against the dark academic background.

### Custom Component: The "Curator Glass" Sidebar
*   A persistent navigation element using 60% opacity `surface` with a heavy blur. It "floats" `spacing-3` away from the screen edge, using `rounded-lg` (1rem).

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical margins (e.g., 8.5rem left, 4rem right) to create an editorial, non-template layout.
*   **Do** allow the `tertiary` (#ff6c95) color to be used for "Spark" moments—notifications or high-priority calls to action.
*   **Do** use the `spacing-24` (8.5rem) token for section padding to let the academic content "breathe."

### Don't
*   **Don't** use pure white (#ffffff) for text. Always use `on_surface` (#f0f0fd) to prevent eye strain in a dark environment.
*   **Don't** use standard 1px borders to separate the "Hub" navigation from the content. Use a `surface-container` background shift.
*   **Don't** use "Drop Shadows" on cards. Use Tonal Layering or Glassmorphism highlights.