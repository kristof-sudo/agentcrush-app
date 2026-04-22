import { CdpClient } from "@coinbase/cdp-sdk";
import { parseEther } from "viem";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const ACCOUNT_FILE = resolve(__dirname, "../cdp-server-wallet-account.json");
const NETWORK = "base-sepolia";
const AMOUNT_ETH = "0.000001"; // 1 microether — intentionally tiny

// ── env validation ────────────────────────────────────────────────────────────

const REQUIRED_ENV = ["CDP_API_KEY_ID", "CDP_API_KEY_SECRET", "CDP_WALLET_SECRET", "CDP_TEST_DESTINATION"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error("Missing required environment variables:", missing.join(", "));
  if (missing.includes("CDP_TEST_DESTINATION")) {
    console.error("\nAdd to your .env file:");
    console.error("  CDP_TEST_DESTINATION=0xYourDestinationAddress");
  }
  process.exit(1);
}

const destination = process.env.CDP_TEST_DESTINATION;

if (!/^0x[0-9a-fA-F]{40}$/.test(destination)) {
  console.error(`CDP_TEST_DESTINATION is not a valid EVM address: ${destination}`);
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

const fromAddress = saved?.account?.address;
if (!fromAddress) {
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

  console.log(`Network  : ${NETWORK}`);
  console.log(`From     : ${fromAddress}`);
  console.log(`To       : ${destination}`);
  console.log(`Amount   : ${AMOUNT_ETH} ETH`);
  console.log();

  let result;
  try {
    result = await cdp.evm.sendTransaction({
      address: fromAddress,
      transaction: {
        to: destination,
        value: parseEther(AMOUNT_ETH),
      },
      network: NETWORK,
    });
  } catch (err) {
    console.error("Transaction failed:", err.message ?? err);
    process.exit(1);
  }

  console.log("Transaction submitted successfully.");
  console.log(`Tx hash  : ${result.transactionHash}`);
  console.log();
  console.log(`Explorer : https://sepolia.basescan.org/tx/${result.transactionHash}`);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
