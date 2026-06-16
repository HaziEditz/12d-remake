import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, mkdir, readFile } from "fs/promises";
import { execSync } from "child_process";

async function buildAll() {
  await rm("dist", { recursive: true, force: true });
  await mkdir("dist", { recursive: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");

  // Read package.json to get all dependencies as externals
  // This forces Render to have dependencies installed, avoiding bundle bloat
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  // All Node.js built-ins — listed both bare and with the node: protocol
  // prefix so that imports like `import { randomUUID } from 'node:crypto'`
  // are also treated as external and never bundled.
  const builtinNames = [
    "assert", "async_hooks", "buffer", "child_process", "cluster",
    "console", "constants", "crypto", "dgram", "dns", "domain",
    "events", "fs", "fs/promises", "http", "http2", "https",
    "inspector", "module", "net", "os", "path", "perf_hooks",
    "process", "punycode", "querystring", "readline", "repl",
    "stream", "stream/promises", "string_decoder", "sys", "timers",
    "timers/promises", "tls", "trace_events", "tty", "url", "util",
    "v8", "vm", "worker_threads", "zlib",
  ];
  const nodeBuiltins = [
    ...builtinNames,
    ...builtinNames.map((m) => `node:${m}`),
  ];

  // Transpile server code with all deps external
  // This means dependencies must be installed at runtime
  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    target: "node18",
    bundle: true,
    format: "esm",
    outfile: "dist/index.mjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    external: [...allDeps, ...nodeBuiltins],
    packages: "external",
    minify: false,
    logLevel: "info",
  });

  // Sync database schema in production deployments
  if (process.env.NODE_ENV === "production" || process.env.RENDER === "true") {
    console.log("syncing database schema...");
    try {
      execSync("npm run db:push", {
        stdio: "inherit",
        env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "0" },
      });
      console.log("✓ Database schema synced");
    } catch (err) {
      console.warn("⚠ Database schema sync skipped (may run on startup)");
    }
  }

  console.log("✓ Build complete");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
