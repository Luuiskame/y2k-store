import fs from "fs"
import path from "path"

/**
 * `medusa build` compiles the backend with every file whose path merely
 * CONTAINS "test" left out (its ignore list is "integration-tests", "test",
 * "unit-tests" and "src/admin", matched with `fileName.includes(...)`; see
 * @medusajs/framework/dist/build-tools/compiler.js). Such a file runs fine
 * under `medusa develop`, which loads the sources, and simply does not exist
 * in production. That is how `POST /admin/push/test` shipped as a 404.
 *
 * Specs are meant to be left out. Anything else with "test" in its path —
 * a route folder, `latest-orders.ts`, `contest.ts` — is a bug.
 */

const SRC = path.resolve(__dirname, "../..")
const ADMIN = path.join(SRC, "admin") // built by Vite, which has no such filter

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return full === ADMIN ? [] : sourceFiles(full)
    }
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })

const isSpec = (relative: string): boolean =>
  relative.split(/[\\/]/).includes("__tests__") ||
  /\.(spec|test)\.tsx?$/.test(relative)

describe("backend file paths", () => {
  it("never contain 'test' outside specs, or the production build drops them", () => {
    const dropped = sourceFiles(SRC)
      .map((file) => path.relative(SRC, file).split(path.sep).join("/"))
      .filter((relative) => relative.includes("test") && !isSpec(relative))

    expect(dropped).toEqual([])
  })

  it("still sees the backend it is guarding", () => {
    const files = sourceFiles(SRC).map((file) => path.relative(SRC, file))
    expect(files.some((f) => f.startsWith(path.join("api", "admin", "push")))).toBe(true)
    expect(files.some((f) => f.startsWith("admin"))).toBe(false)
  })
})
