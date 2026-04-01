import { defineConfig } from "tsup";

export default defineConfig([
  // ESM (setup.despia.com /despia/powersync.js)
  {
    entry: { powersync: "src/index.ts" },
    format: ["esm"],
    outDir: "dist/esm",
    sourcemap: true,
    outExtension: () => ({ js: ".js" }),
  },
  // ESM
  {
    entry: ["src/index.ts"],
    format: ["esm"],
    outDir: "dist/esm",
    sourcemap: true,
    outExtension: () => ({ js: ".mjs" }),
  },
  // CJS
  {
    entry: ["src/index.ts"],
    format: ["cjs"],
    outDir: "dist/cjs",
    sourcemap: true,
    outExtension: () => ({ js: ".cjs" }),
  },
  // UMD (IIFE with global name)
  {
    entry: { "despia-powersync": "src/index.ts" },
    format: ["iife"],
    outDir: "dist/umd",
    globalName: "DespiaPowerSync",
    minify: true,
    outExtension: () => ({ js: ".min.js" }),
    footer: {
      // Make UMD-style: attach to window if no module system
      js: `if(typeof module==="object"&&module.exports){module.exports=DespiaPowerSync}`,
    },
  },
]);

