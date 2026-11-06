import http from "node:http";
import { parse } from "node:url";
import {
  LeafManager,
  NONCE_MANAGER_ADDRESS,
  ARKIV_CHAIN_ID,
  ARKIV_RPC_URL,
  type LeafStatus,
} from "q-frame-sdk";
import { runSdkVerification } from "./live-test";

const PORT = 3001;
const manager = new LeafManager({
  rpcUrl: "https://rpc1.hegota.ethrex.xyz",
  walletAddress: "0xe5c5A34833db3A90E30adCD98f2955E36496483B",
  canonicalCap: 100_000,
  altMempoolCap: 2_000_000,
  arkivConfig: {
    defaultTtlMinutes: 10,
  },
});

function renderHtml(testOutput: any) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Q-Frame SDK Consumer Verification App</title>
  <style>
    :root {
      --bg: #F9FBFB;
      --card-bg: #FFFFFF;
      --border: #1A1A1A;
      --text: #1A1A1A;
      --muted: #666666;
      --red: #D82C2C;
      --emerald: #059669;
      --emerald-bg: #ECFDF5;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; }
    body { background: var(--bg); color: var(--text); padding: 32px 20px; line-height: 1.5; }
    .container { max-width: 960px; margin: 0 auto; }
    header { border-bottom: 2px solid var(--border); padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
    h1 { font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px; }
    .badge { background: var(--emerald-bg); color: var(--emerald); border: 1px solid #A7F3D0; padding: 4px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: var(--card-bg); border: 1.5px solid var(--border); padding: 18px; box-shadow: 2px 2px 0px var(--border); }
    .card h3 { font-size: 13px; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; font-weight: 700; }
    .card .val { font-size: 16px; font-weight: 700; word-break: break-all; }
    .card-full { grid-column: 1 / -1; }
    .btn-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
    button { background: var(--border); color: white; border: none; padding: 10px 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; cursor: pointer; transition: background 0.15s; }
    button:hover { background: var(--red); }
    pre { background: #111; color: #EEE; padding: 16px; border: 1.5px solid var(--border); font-size: 12px; overflow-x: auto; max-height: 380px; }
    .status-item { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #EEE; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="width: 12px; height: 12px; background: var(--red); display: inline-block;"></span>
          <h1>3rd-Party Consumer App</h1>
        </div>
        <p style="font-size: 13px; color: var(--muted);">Testing npm package <code style="font-weight: bold; color: var(--text);">q-frame-sdk@0.1.1</code> from isolated project root.</p>
      </div>
      <div>
        <span class="badge">SDK Verified · Active</span>
      </div>
    </header>

    <div class="btn-row">
      <button onclick="runEndpoint('/api/run-all')">▶ Re-Run All E2E Tests</button>
      <button onclick="runEndpoint('/api/allocate')">+ Allocate Channel</button>
      <button onclick="runEndpoint('/api/bump')">🔥 Safe Fee Bump</button>
      <button onclick="runEndpoint('/api/sync-arkiv')">⚡ Sync Arkiv DB-Chain</button>
    </div>

    <div class="grid">
      <div class="card">
        <h3>EIP-8250 Predeploy Address</h3>
        <div class="val" style="font-family: monospace;">${NONCE_MANAGER_ADDRESS}</div>
      </div>
      <div class="card">
        <h3>Arkiv Rabdi Testnet</h3>
        <div class="val">Chain ID: ${ARKIV_CHAIN_ID}</div>
      </div>
      <div class="card">
        <h3>Hegot&aacute; Ethrex Devnet</h3>
        <div class="val">Chain ID: 3151908</div>
      </div>

      <div class="card card-full">
        <h3>Live SDK Test Results (Direct Execution via q-frame-sdk)</h3>
        <div id="results">
          ${Object.entries(testOutput.results || {})
            .map(
              ([k, v]) => `
            <div class="status-item">
              <span style="font-family: monospace; font-weight: bold;">${k}</span>
              <span style="color: ${v ? "var(--emerald)" : "var(--red)"}; font-weight: bold;">${v ? "✓ PASSED" : "✕ FAILED"}</span>
            </div>`
            )
            .join("")}
        </div>
      </div>

      <div class="card card-full">
        <h3>Live Console &amp; Journal Output</h3>
        <pre id="output">App initialized. Click any button above to test SDK methods live against Hegota and Arkiv.</pre>
      </div>
    </div>
  </div>

  <script>
    async function runEndpoint(url) {
      const out = document.getElementById("output");
      out.textContent = "Executing " + url + "...";
      try {
        const res = await fetch(url, { method: "POST" });
        const data = await res.json();
        out.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        out.textContent = "Error: " + err.message;
      }
    }
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  const parsed = parse(req.url || "/", true);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (parsed.pathname === "/" || parsed.pathname === "/index.html") {
    const testOutput = await runSdkVerification();
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(renderHtml(testOutput));
    return;
  }

  if (parsed.pathname === "/api/run-all") {
    const testOutput = await runSdkVerification();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(testOutput));
    return;
  }

  if (parsed.pathname === "/api/allocate") {
    const leaf = await manager.allocateLeaf();
    const nonceKey = manager.deriveNonceKey(leaf);
    const status = await manager.getLeafStatus(leaf);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        action: "allocateLeaf",
        allocatedLeafIndex: leaf.toString(),
        nonceKey: "0x" + nonceKey.toString(16),
        localState: status.localState,
        journalSize: manager.exportJournal().length,
      })
    );
    return;
  }

  if (parsed.pathname === "/api/bump") {
    const bump = await manager.bumpFee(0n, "Fee bump from 3rd-party webapp");
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        action: "bumpFee",
        burnedOldLeafIndex: bump.burnedOldLeafIndex.toString(),
        newReplacementLeafIndex: bump.newLeafIndex.toString(),
        journalSize: manager.exportJournal().length,
      })
    );
    return;
  }

  if (parsed.pathname === "/api/sync-arkiv") {
    const syncCount = await manager.syncWithArkiv();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        action: "syncWithArkiv",
        targetChain: "Arkiv Rabdi Testnet (7794095)",
        syncedNewEntities: syncCount,
        totalJournalEntries: manager.exportJournal().length,
      })
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

server.listen(PORT, () => {
  console.log(`[test-consumer-app] Live consumer app running at http://localhost:${PORT}`);
});
