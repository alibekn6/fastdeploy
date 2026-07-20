#!/usr/bin/env node
/**
 * A16 story-inventory gate.
 *
 * The list below is the plan's contract (bead `nextjs-frontend-6qb.10`): every
 * component that renders UI must ship a co-located story file. Adding or
 * renaming a client-child component means updating this list in the same
 * change — that coupling is the point, it is what stops coverage from rotting.
 *
 * Exits 0 when every path exists; otherwise prints the missing paths and exits 1.
 */
import { accessSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** @type {readonly string[]} */
const INVENTORY = [
  "src/shared/ui/button.stories.tsx",
  "src/shared/ui/card.stories.tsx",
  "src/shared/ui/form.stories.tsx",
  "src/shared/ui/input.stories.tsx",
  "src/shared/ui/label.stories.tsx",
  "src/features/auth/ui/sign-in-form.stories.tsx",
  "src/features/auth/ui/sign-up-form.stories.tsx",
  "src/widgets/header/ui/header.stories.tsx",
  "src/shared/analytics/consent-banner.stories.tsx",
  "src/pages/dashboard/ui/post-list.stories.tsx",
  "src/pages/home/ui/home-page.stories.tsx",
  "src/pages/login/ui/login-page.stories.tsx",
  "src/pages/examples/ssr-page/ui/comments-list.stories.tsx",
  "src/pages/examples/websocket-page/ui/connection-status.stories.tsx",
  "src/pages/examples/websocket-page/ui/message-list.stories.tsx",
];

const missing = INVENTORY.filter((relativePath) => {
  try {
    accessSync(join(repoRoot, relativePath));
    return false;
  } catch {
    return true;
  }
});

if (missing.length > 0) {
  console.error(`Missing ${missing.length} of ${INVENTORY.length} inventory story files:`);
  for (const relativePath of missing) console.error(`  - ${relativePath}`);
  process.exit(1);
}

console.log(`All ${INVENTORY.length} inventory story files present.`);
