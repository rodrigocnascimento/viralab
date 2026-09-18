# Landing v2 — conversion and search architecture

## Information architecture
Desktop: header → product-specific hero + dog/sample → concrete sample signal → timing thesis → three signal types with operator actions → relative-performance pipeline → score model → compounding dataset → early access → entity/footer.

Mobile keeps the same order and retains both the dog/sample visual and a visible early-access CTA. Navigation becomes an explicit menu rather than disappearing.

## CTA contract
Primary CTA is always **Get early access** and lands on `#access`. Secondary hero CTA is **See a live sample signal** and lands on `#sample`. No CTA claims to open a signal feed until the feed is actually available.

The current early-access form intentionally uses the visitor's email client (`mailto:`) because there is no consent/storage backend yet. It collects email, role and optional niche in the drafted message; the Privacy page states this behavior. Replace with a server-side waitlist endpoint before measuring conversion.

## Search/entity strategy
Home targets the category/entity combination **Viralab — YouTube Opportunity Intelligence**, with natural coverage of breakout channels, outlier videos, niche momentum, channel baseline and relative performance.

Only the home is in the sitemap. Privacy/Terms are real static pages but noindex. Do not add /signals or /how to the sitemap until they have independent, indexable content.

Open Graph uses a real 1200×630 branded asset. JSON-LD includes Organization, WebSite and SoftwareApplication without invented pricing or reviews.

## Visual system
Keep cream/paper/chocolate/caramel. Green represents positive acceleration; red is reserved for decay/negative evidence. The dog is the single illustration system: the signal is still in the den before the market sees it. Mobile reduces the illustration rather than removing it.

## Deferred
- Real server-side waitlist persistence + consent/audit
- PNG social card if platform compatibility requires raster (current asset is SVG)
- Cloudflare response security headers: configure at the edge after validating CSP against production assets/API
- /signals with real dataset samples
- /how as an independently indexable methodology page
- hreflang/PT-BR when a real localized URL exists
- external X/LinkedIn links only after official profiles exist

## Removed
- “See opportunity signals” CTA that only scrolled to taxonomy
- “See the signal model” recycled CTA
- active-development disclaimer in the hero
- disappearing mobile navigation
- missing social image
- fake SPA Privacy/Terms destinations
