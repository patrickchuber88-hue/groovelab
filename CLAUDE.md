# GrooveLab Layout & Design Guidelines

This document outlines the strict guidelines and coding standards for layout design and user interfaces in GrooveLab, ensuring consistency and high fidelity.

## UI Overlap & Responsiveness Rule (CRITICAL)

* **No Overlaps**: Overlaps between UI components, cards, widgets, or text elements are strictly unacceptable.
* **Viewport Adaptability**: UI components must scale down gracefully without squishing content or causing text collisions on smaller viewports.
* **Fluid Wrap standard**:
  - Always prefer responsive Flexbox layouts with wrapping enabled (`flexDirection: 'row'`, `flexWrap: 'wrap'`) or CSS Grid templates with auto-fit parameters (`gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))'`).
  - Use defensible flex-basis settings (e.g. `flex: '1 1 300px'`) so columns flow vertically on mobile screens and side-by-side on laptop screens.
* **No Hardcoded Heights**: Never hardcode fixed pixel heights (`height: '250px'`) on text containers or text-wrapping cards. Use fluid sizing (`minHeight`, `height: 'auto'`) combined with standard padding so that cards grow naturally when content increases.
