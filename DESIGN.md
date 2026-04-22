# Enabled site – design themes

## Current theme: Light / friendly
`styles.css` is the **lighter, more fun** theme: cream background, soft teal accents, white cards with soft shadows. It stays professional but feels more approachable.

## Revert to original (corporate) theme
To switch back to the original darker, more corporate look:

1. In every HTML file that links the stylesheet, change:
   ```html
   <link rel="stylesheet" href="styles.css" />
   ```
   to:
   ```html
   <link rel="stylesheet" href="styles-corporate.css" />
   ```

2. Or rename files: e.g. rename `styles.css` to `styles-light.css`, then rename `styles-corporate.css` to `styles.css`.

**Files that reference the stylesheet:** `index.html`, `services.html`, `website.html`, `business-assessment.html`, `referrals.html`, `dashboard.html`.
