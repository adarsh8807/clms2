/**
 * vercel-build.mjs
 *
 * Runs after `vite build` and assembles the Vercel Build Output API v3 structure:
 *
 *   .vercel/output/
 *   ├── config.json                  ← route config
 *   ├── static/                      ← client assets (served by Vercel CDN)
 *   └── functions/
 *       └── index.func/
 *           ├── .vc-config.json      ← edge function config
 *           └── index.js             ← server bundle entry
 */
// #!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;

const distClient = path.join(root, "dist", "client");
const distServer = path.join(root, "dist", "server");
const outDir = path.join(root, ".vercel", "output");

fs.rmSync(outDir, { recursive: true, force: true });

fs.mkdirSync(path.join(outDir, "static"), {
  recursive: true,
});

fs.mkdirSync(path.join(outDir, "functions", "index.func"), {
  recursive: true,
});

/*
 * Vercel output configuration
 */
fs.writeFileSync(
  path.join(outDir, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        {
          src: "^/assets/(.+)$",
          headers: {
            "cache-control":
              "public, max-age=31536000, immutable",
          },
          continue: true,
        },
        {
          handle: "filesystem",
        },
        {
          src: "/(.*)",
          dest: "/index",
        },
      ],
    },
    null,
    2,
  ),
);

/*
 * Copy client files
 */
copyDir(
  distClient,
  path.join(outDir, "static"),
);

/*
 * Server function
 */
const funcDir = path.join(
  outDir,
  "functions",
  "index.func",
);

copyDir(distServer, funcDir);

/*
 * IMPORTANT:
 * Include the project's dependencies inside the
 * Vercel function so React and other packages can
 * be resolved at runtime.
 */
const nodeModules = path.join(
  root,
  "node_modules",
);

const functionNodeModules = path.join(
  funcDir,
  "node_modules",
);

if (fs.existsSync(nodeModules)) {
  copyDir(nodeModules, functionNodeModules);
} else {
  console.error(
    "node_modules directory not found.",
  );

  process.exit(1);
}

/*
 * Function package.json
 */
fs.writeFileSync(
  path.join(funcDir, "package.json"),
  JSON.stringify(
    {
      type: "module",
    },
    null,
    2,
  ),
);

/*
 * Vercel Node.js handler
 */
fs.writeFileSync(
  path.join(funcDir, "index.mjs"),
  `
import handler from "./server.js";

export default async function (req, res) {
  try {
    const url = new URL(
      req.url,
      \`https://\${req.headers.host}\`,
    );

    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    const init = {
      method: req.method,
      headers,
    };

    if (
      req.method !== "GET" &&
      req.method !== "HEAD"
    ) {
      init.body = await readBody(req);
      init.duplex = "half";
    }

    const webRequest = new Request(
      url.toString(),
      init,
    );

    const webResponse =
      await handler.fetch(webRequest);

    res.statusCode = webResponse.status;

    webResponse.headers.forEach(
      (value, key) => {
        res.setHeader(key, value);
      },
    );

    const buffer =
      await webResponse.arrayBuffer();

    res.end(Buffer.from(buffer));
  } catch (error) {
    console.error(
      "Vercel SSR Error:",
      error,
    );

    res.statusCode = 500;

    res.setHeader(
      "content-type",
      "text/plain",
    );

    res.end(
      "Internal Server Error",
    );
  }
}

function readBody(req) {
  return new Promise(
    (resolve, reject) => {
      const chunks = [];

      req.on("data", (chunk) => {
        chunks.push(chunk);
      });

      req.on("end", () => {
        resolve(
          Buffer.concat(chunks),
        );
      });

      req.on("error", reject);
    },
  );
}
`,
);

/*
 * Vercel function configuration
 */
fs.writeFileSync(
  path.join(funcDir, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs20.x",
      handler: "index.mjs",
      launchWorker: false,
    },
    null,
    2,
  ),
);

console.log(
  "✓ Vercel output assembled successfully",
);

console.log(
  "✓ React and dependencies copied into SSR function",
);

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(
      "Source not found:",
      src,
    );

    return;
  }

  fs.mkdirSync(dest, {
    recursive: true,
  });

  for (
    const entry of fs.readdirSync(
      src,
      { withFileTypes: true },
    )
  ) {
    const srcPath = path.join(
      src,
      entry.name,
    );

    const destPath = path.join(
      dest,
      entry.name,
    );

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(
        srcPath,
        destPath,
      );
    }
  }
}