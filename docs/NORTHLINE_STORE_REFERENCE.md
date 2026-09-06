# Northline Store Reference

Time Circuit uses the **Northline Store tab** as a layout and shopping-interaction reference only. Northline is not a runtime dependency, and its player/Listen presentation is not a Time Circuit design source.

Reference behavior copied only inside the Time Circuit **Store** view:

- large editorial product cards;
- direct variant selection;
- Add to Bag from the product card;
- persistent Bag count;
- slide-over cart drawer;
- responsive merchandise grid.

The Time Circuit **Listen** view retains its native Time-Circuit design: cover art beside the large SVG/WebAudio visualizer, TIME CIRCUITS DEST/FLUX readout, classic Prev / Play / Next / Restart transport, seek and volume controls, and numbered playlist. Archive also retains Time Circuit-native presentation.

Time Circuit does **not** consume Northline store data, checkout configuration, product identity, player code, or visualizer design. Its merchandise source remains the local `time-circuit` destination manifest, `store.json`, governed by `docs/FUTURES_PAST_STORE.md`.

The Time Circuit store remains stricter than Northline's general collection surface: only Future's Past hoodies with canonical `avp_*` / `avv_*` identity may become live merchandise. Provider/Square identity remains forbidden in the browser, and checkout remains gated behind the verified NXCore Commerce handoff.
