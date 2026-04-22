import { CdpClient } from "@coinbase/cdp-sdk";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNT_FILE = resolve(__dirname, "../cdp-server-wallet-account.json");
const NETWORK = "base-sepolia";

// ── env validation ────────────────────────────────────────────────────────────

const REQUIRED_ENV = ["CDP_API_KEY_ID", "CDP_API_KEY_SECRET", "CDP_WALLET_SECRET"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error("Missing required environment variables:", missing.join(", "));
  process.exit(1);
}

// ── load saved account ────────────────────────────────────────────────────────

let saved;
try {
  saved = JSON.parse(readFileSync(ACCOUNT_FILE, "utf8"));
} catch (err) {
  if (err.code === "ENOENT") {
    console.error(`No account file found at ${ACCOUNT_FILE}.`);
    console.error("Run `npm run create-wallet` first.");
  } else {
    console.error("Failed to read account file:", err.message ?? err);
  }
  process.exit(1);
}

const address = saved?.account?.address;
if (!address) {
  console.error("Account file is missing `account.address`. Re-run create-wallet.");
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

  console.log(`Checking balances for ${address} on ${NETWORK}...\n`);

  let result;
  try {
    result = await cdp.evm.listTokenBalances({ address, network: NETWORK });
  } catch (err) {
    console.error("Failed to fetch balances:", err.message ?? err);
    process.exit(1);
  }

  const { balances } = result;

  if (balances.length === 0) {
    console.log("No token balances found. The account may not be funded yet.");
    console.log(`\nTo request testnet ETH, run the CDP faucet or visit:`);
    console.log(`  https://www.alchemy.com/faucets/base-sepolia`);
    return;
  }

  console.log(`Found ${balances.length} token balance(s):\n`);

  for (const { token, amount } of balances) {
    const humanAmount = Number(amount.amount) / 10 ** amount.decimals;
    const label = token.symbol ?? token.name ?? "unknown";
    const contractInfo = token.contractAddress
      ? ` (${token.contractAddress})`
      : " (native)";

    console.log(`  ${label.padEnd(8)} ${humanAmount.toFixed(6)}${contractInfo}`);
  }

  console.log();
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
