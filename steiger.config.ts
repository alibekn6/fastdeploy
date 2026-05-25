import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      // Boilerplate ships demonstrative entity slices (e.g. the `@x` cross-import example) and
      // wires their consumers incrementally; this advisory rule would flag them as unreferenced.
      "fsd/insignificant-slice": "off",
      // The `shared/api` layer intentionally exposes cohesive `db` and `auth` modules (each a
      // folder with its own index) consumed across layers; Steiger treats those folders as slices
      // and flags cross-layer imports of them. The shared layer deliberately relaxes public-API
      // enforcement (see the shared override below), so disable the sidestep rule to match.
      "fsd/no-public-api-sidestep": "off",
    },
  },
  {
    files: ["./src/shared/**"],
    rules: { "fsd/public-api": "off", "fsd/no-segmentless-slices": "off" },
  },
]);
