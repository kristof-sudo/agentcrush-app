import { CdpClient } from "@coinbase/cdp-sdk";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNT_FILE = resolve(__dirname, "../cdp-server-wallet-account.json");

// ── env validation ────────────────────────────────────────────────────────────

const REQUIRED_ENV = ["CDP_API_KEY_ID", "CDP_API_KEY_SECRET", "CDP_WALLET_SECRET"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error("Missing required environment variables:", missing.join(", "));
  console.error("Copy .env.example to .env and fill in your CDP credentials.");
  process.exit(1);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  let cdp;
  try {
    cdp = new CdpClient();
  } catch (err) {
    console.error("CDP client init failed:", err.message ?? err);
    process.exit(1);
  }

  let account;
  try {
    account = await cdp.evm.createAccount();
  } catch (err) {
    console.error("EVM account creation failed:", err.message ?? err);
    process.exit(1);
  }

  const accountMeta = {
    address: account.address,
    name: account.name ?? null,
  };

  console.log("EVM account created successfully");
  console.log("  address:", accountMeta.address);
  if (accountMeta.name) console.log("  name   :", accountMeta.name);

  const payload = {
    network_family: "evm",
    intended_network: "base-sepolia",
    created_for: "AgentCrush",
    created_at: new Date().toISOString(),
    account: accountMeta,
  };

  try {
    writeFileSync(ACCOUNT_FILE, JSON.stringify(payload, null, 2), "utf8");
    console.log("Account metadata saved to:", ACCOUNT_FILE);
  } catch (err) {
    console.error("Failed to write account file:", err.message ?? err);
    process.exit(1);
  }

  return payload;
}

// ── helper export ─────────────────────────────────────────────────────────────

export function loadSavedAccount() {
  try {
    const raw = readFileSync(ACCOUNT_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new Error(
        `No saved account found at ${ACCOUNT_FILE}. Run the create-wallet script first.`
      );
    }
    throw new Error(`Failed to read account file: ${err.message ?? err}`);
  }
}

// ── entrypoint ────────────────────────────────────────────────────────────────

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
}
