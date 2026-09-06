# Northline Store Reference

Time Circuit intentionally reuses the interaction grammar of the Northline EchoStory store without creating a runtime dependency on Northline.

Reference behavior copied at the UX level:

- sticky Listen / Archive / Store navigation;
- large editorial product cards;
- direct variant selection;
- Add to Bag from the product card;
- persistent Bag count in the top bar;
- slide-over cart drawer;
- responsive three-column product grid on desktop.

Time Circuit does **not** consume Northline store data, checkout configuration, or product identity. Its merchandise source remains the local `time-circuit` destination manifest, `store.json`, governed by `docs/FUTURES_PAST_STORE.md`.

The Time Circuit store remains stricter than Northline's general collection surface: only Future's Past hoodies with canonical `avp_*` / `avv_*` identity may become live merchandise. Provider/Square identity remains forbidden in the browser, and checkout remains gated behind the verified NXCore Commerce handoff.
