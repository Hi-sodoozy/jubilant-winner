# Edit website content (portal)

Content is editable site-wide via **Dashboard → Edit website content**. Choose a page from the dropdown, edit the fields, and press **Publish**. The live site reads overrides from `localStorage` (key: `iainduguid_site_content`).

## Adding a new page to the portal

When you add a new HTML page to the site, you can make its copy editable as follows:

1. **Register the page** in `content-registry.js`:
   - Add an entry to the `CONTENT_PAGES` array: `{ id: 'your-page-id', label: 'Your Page Name', file: 'your-page.html' }`.
   - Add a field list to `CONTENT_FIELDS['your-page-id']`: an array of `{ id, label, type: 'text'|'html', default, rows? }` for each editable block.

2. **Mark up the new page**:
   - On `<body>` add: `data-page-id="your-page-id"`.
   - On each editable element add: `data-content-id="your-page-id.field-id"` (use the same `id` as in the registry).
   - For blocks that allow HTML (paragraphs, lists), add: `data-content-type="html"`.

3. **Include the apply script** before `</body>`:  
   `<script src="apply-content.js"></script>`

After that, the new page will appear in the Edit website content dropdown and its copy will be editable and applied on load.

## Shared footer

Footer lines are shared across the site. They use content IDs `index.footer-line1` and `index.footer-line2`. Every page that shows the site footer should use those same `data-content-id` values so a change in the portal updates the footer everywhere.
