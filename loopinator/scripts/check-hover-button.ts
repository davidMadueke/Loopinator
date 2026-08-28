/**
 * Drives the /dev/hover-button page in headless Chrome and asserts that the reveal
 * changes the button's layout size. jsdom cannot do this: it has no layout engine,
 * so every offsetWidth there is 0 and the "always expanded" bug is invisible.
 *
 * Usage: bun scripts/check-hover-button.ts [url]
 * Needs a dev server already running (bun run dev:web).
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TARGET_URL =
  process.argv[2] ??
  process.env.HOVER_BUTTON_URL ??
  "http://localhost:3002/dev/hover-button";
const DEBUG_PORT = Number(process.env.CHROME_DEBUG_PORT ?? 9333);
const RESULT_TIMEOUT_MS = 30_000;
/** Matches the 300ms reveal transition plus room for a frame or two. */
const SETTLE_MS = 450;
const LOG_PREFIX = "[hover-button-dev]";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter((path): path is string => Boolean(path));

function findChrome(): string {
  const chrome = CHROME_CANDIDATES.find((path) => existsSync(path));
  if (!chrome) {
    throw new Error(
      `No Chrome found. Set CHROME_PATH. Looked in:\n  ${CHROME_CANDIDATES.join("\n  ")}`,
    );
  }
  return chrome;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type CdpMessage = {
  id?: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: { message: string };
};

class Cdp {
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void }
  >();
  private readonly listeners: Array<(message: CdpMessage) => void> = [];

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data)) as CdpMessage;

      if (message.id !== undefined) {
        const entry = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) {
          entry?.reject(new Error(message.error.message));
        } else {
          entry?.resolve(message.result ?? {});
        }
        return;
      }

      for (const listener of this.listeners) {
        listener(message);
      }
    });
  }

  static connect(url: string) {
    return new Promise<Cdp>((resolve, reject) => {
      const socket = new WebSocket(url);
      socket.addEventListener("open", () => resolve(new Cdp(socket)));
      socket.addEventListener("error", () => reject(new Error(`Cannot open ${url}`)));
    });
  }

  on(listener: (message: CdpMessage) => void) {
    this.listeners.push(listener);
  }

  send(method: string, params: Record<string, unknown> = {}) {
    const id = this.nextId++;
    return new Promise<Record<string, unknown>>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function waitForDevTools() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
      if (response.ok) {
        return;
      }
    } catch {
      // Chrome is not listening yet.
    }
    await wait(250);
  }
  throw new Error(`Chrome DevTools never answered on port ${DEBUG_PORT}`);
}

async function evaluate(cdp: Cdp, expression: string) {
  const result = (await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
  })) as { result?: { value?: unknown } };

  return result.result?.value;
}

const UNCONTROLLED_SELECTOR = '[data-testid="hover-button-uncontrolled"]';
/** Set to a directory to save away/over PNGs of the button under the real cursor. */
const SCREENSHOT_DIR = process.env.HOVER_BUTTON_SCREENSHOT_DIR;

async function widthOf(cdp: Cdp, selector: string) {
  return Number(
    await evaluate(cdp, `document.querySelector('${selector}')?.offsetWidth ?? -1`),
  );
}

type Rect = { x: number; y: number; width: number; height: number };

async function screenshot(cdp: Cdp, name: string, rect: Rect) {
  if (!SCREENSHOT_DIR) {
    return;
  }

  const padding = 16;
  const result = (await cdp.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    clip: {
      x: Math.max(0, rect.x - padding),
      y: Math.max(0, rect.y - padding),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      scale: 2,
    },
  })) as { data?: string };

  const path = join(SCREENSHOT_DIR, `${name}.png`);
  writeFileSync(path, Buffer.from(String(result.data ?? ""), "base64"));
  console.log(`  saved ${path}`);
}

/** Moves the real cursor over the uncontrolled button so the hover handlers run. */
async function measureRealHover(cdp: Cdp) {
  // The cursor can only hover what is on screen, so bring the button into view first.
  await evaluate(
    cdp,
    `document.querySelector('${UNCONTROLLED_SELECTOR}')?.scrollIntoView({ block: "center" })`,
  );
  await wait(100);

  const rect = (await evaluate(
    cdp,
    `(() => {
      const element = document.querySelector('${UNCONTROLLED_SELECTOR}');
      if (!element) return null;
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    })()`,
  )) as Rect | null;

  if (!rect) {
    return null;
  }

  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
  await wait(SETTLE_MS);
  const away = await widthOf(cdp, UNCONTROLLED_SELECTOR);
  await screenshot(cdp, "hover-away", rect);

  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  });
  await wait(SETTLE_MS);
  const over = await widthOf(cdp, UNCONTROLLED_SELECTOR);
  await screenshot(cdp, "hover-over", {
    ...rect,
    width: Math.max(rect.width, over),
  });

  return { away, over };
}

function parseSize(logs: string[], label: string): number | null {
  const line = logs.find((entry) => entry.includes(`${label} `));
  const match = line?.match(/(?:width|height)=(\d+)px/);
  return match?.[1] ? Number(match[1]) : null;
}

const chromePath = findChrome();
const profileDir = mkdtempSync(join(tmpdir(), "hover-button-check-"));

const chrome = spawn(
  chromePath,
  [
    "--headless",
    "--disable-gpu",
    "--no-first-run",
    "--no-sandbox",
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const consoleLogs: string[] = [];
let cdp: Cdp | null = null;

try {
  await waitForDevTools();

  const tab = (await (
    await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, {
      method: "PUT",
    })
  ).json()) as { webSocketDebuggerUrl: string };

  cdp = await Cdp.connect(tab.webSocketDebuggerUrl);

  cdp.on((message) => {
    if (message.method !== "Runtime.consoleAPICalled") {
      return;
    }

    const args = (message.params?.args ?? []) as Array<{ value?: unknown }>;
    const text = args.map((arg) => String(arg.value ?? "")).join(" ");
    if (text.startsWith(LOG_PREFIX)) {
      consoleLogs.push(text);
      console.log(`  chrome console: ${text}`);
    }
  });

  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  // Tall enough that the whole page fits, so element rects match page coordinates
  // (screenshot clips) and everything is hoverable without scrolling.
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 900,
    height: 1400,
    deviceScaleFactor: 1,
    mobile: false,
  });

  console.log(`Loading ${TARGET_URL}`);
  await cdp.send("Page.navigate", { url: TARGET_URL });

  const deadline = Date.now() + RESULT_TIMEOUT_MS;
  let status = "running";

  while (Date.now() < deadline) {
    const value = await evaluate(
      cdp,
      `document.querySelector('[data-testid="hover-button-dev-result"]')?.dataset.status ?? "missing"`,
    );
    status = String(value);
    if (status === "pass" || status === "fail") {
      break;
    }
    await wait(250);
  }

  if (status !== "pass" && status !== "fail") {
    throw new Error(
      `Result element stayed "${status}" for ${RESULT_TIMEOUT_MS}ms. Is the dev server running at ${TARGET_URL}?`,
    );
  }

  const collapsed = parseSize(consoleLogs, "collapsed");
  const expanded = parseSize(consoleLogs, "expanded");
  const failures: string[] = [];

  if (collapsed === null || expanded === null) {
    failures.push("Missing collapsed/expanded console logs");
  } else if (collapsed === expanded) {
    failures.push(
      `Collapsed and expanded sizes are both ${collapsed}px, so expandedView is always visible`,
    );
  } else if (expanded < collapsed) {
    failures.push(`Hover shrank the button: ${collapsed}px to ${expanded}px`);
  }

  if (status === "fail") {
    failures.push("Page reported status=fail");
  }

  const realHover = await measureRealHover(cdp);
  if (!realHover) {
    failures.push(`No element matched ${UNCONTROLLED_SELECTOR}`);
  } else {
    console.log(
      `  real cursor hover: ${realHover.away}px away, ${realHover.over}px over`,
    );
    if (realHover.over <= realHover.away) {
      failures.push(
        `Moving the cursor onto the button did not expand it (${realHover.away}px to ${realHover.over}px)`,
      );
    }
  }

  if (failures.length > 0) {
    console.error(`\nFAIL\n  ${failures.join("\n  ")}`);
    process.exitCode = 1;
  } else {
    console.log(
      `\nPASS ${collapsed}px collapsed, ${expanded}px expanded (+${(expanded ?? 0) - (collapsed ?? 0)}px on hover)`,
    );
  }
} finally {
  cdp?.close();
  chrome.kill();
}
