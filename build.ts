import { build, emptyDir } from "https://deno.land/x/dnt@0.26.0/mod.ts";
import * as esbuild from "https://deno.land/x/esbuild@v0.14.45/mod.js";
import packageInfo from "./package.json" assert { type: "json" };

await emptyDir("./dist");

//** NPM ES Module for Node.js and Browser */

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./dist",
  test: false,
  scriptModule: false,
  typeCheck: false,
  shims: {},
  package: {
    ...packageInfo,
    engines: {
      node: ">=14",
    },
    dependencies: {
      "node-fetch": "^3.2.3",
    },
    main: "./esm/mod.js",
    type: "module",
  },
});

Deno.copyFileSync("LICENSE", "dist/LICENSE");
Deno.copyFileSync("README.md", "dist/README.md");

// copy wasm files
Deno.copyFileSync(
  "src/core/wasm_modules/cardano-multiplatform-lib-nodejs/cardano_multiplatform_lib_bg.wasm",
  "dist/esm/src/core/wasm_modules/cardano-multiplatform-lib-nodejs/cardano_multiplatform_lib_bg.wasm"
);
Deno.writeTextFileSync(
  "dist/esm/src/core/wasm_modules/cardano-multiplatform-lib-nodejs/package.json",
  JSON.stringify({ type: "commonjs" })
);
Deno.copyFileSync(
  "src/core/wasm_modules/cardano-multiplatform-lib-web/cardano_multiplatform_lib_bg.wasm",
  "dist/esm/src/core/wasm_modules/cardano-multiplatform-lib-web/cardano_multiplatform_lib_bg.wasm"
);

//** Web ES Module */

await esbuild.build({
  bundle: true,
  format: "esm",
  entryPoints: ["./mod.ts"],
  outfile: "./dist/web/mod.js",
  minify: true,
  external: [
    "./wasm_modules/cardano-multiplatform-lib-nodejs/cardano_multiplatform_lib.js",
    "node-fetch",
  ],
});
esbuild.stop();

// copy wasm file
Deno.mkdirSync("dist/web/wasm_modules/cardano-multiplatform-lib-web", {
  recursive: true,
});
Deno.copyFileSync(
  "src/core/wasm_modules/cardano-multiplatform-lib-web/cardano_multiplatform_lib_bg.wasm",
  "dist/web/wasm_modules/cardano-multiplatform-lib-web/cardano_multiplatform_lib_bg.wasm"
);