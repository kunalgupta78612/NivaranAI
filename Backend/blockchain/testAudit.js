require("dotenv").config();
const { ethers } = require("ethers");
const { logAuditEvent, getAuditInfo } = require("./auditService");

async function main() {
  console.log("--- Avalanche Fuji Audit Trail Verification ---");
  const rawKey = process.env.AVALANCHE_PRIVATE_KEY || "";
  let key = rawKey.trim().replace(/^["']|["']$/g, "").trim();

  if (key && key.length === 42) {
    console.log(`\n❌ FORMAT ERROR: AVALANCHE_PRIVATE_KEY in Backend/.env is set to a Public Wallet Address: ${key}`);
    console.log(`👉 An EVM Public Address is 42 characters (starts with 0x...).`);
    console.log(`👉 A Private Key is 64 hexadecimal characters (or 66 starting with 0x).`);
    console.log(`\nHow to get your Private Key in MetaMask / Core Wallet:`);
    console.log(`1. Open your Wallet (MetaMask / Core / Rabby)`);
    console.log(`2. Click Account Details -> Export Private Key`);
    console.log(`3. Copy the 64-character secret private key string and paste it into Backend/.env as AVALANCHE_PRIVATE_KEY=...`);
    return;
  }

  try {
    const rpcUrl = process.env.AVALANCHE_FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc";
    const provider = new ethers.JsonRpcProvider(rpcUrl, { chainId: 43113, name: "avalanche-fuji" });
    const wallet = new ethers.Wallet(key, provider);
    console.log("Wallet address derived from private key:", wallet.address);

    const balance = await provider.getBalance(wallet.address);
    const balanceAvax = ethers.formatEther(balance);
    console.log("Wallet Fuji AVAX Balance:", balanceAvax, "AVAX");

    const auditInfo = await getAuditInfo("TEST-INIT");
    console.log("Target Contract Address:", auditInfo.contractAddress);
    if (auditInfo.owner) {
      console.log("Contract Owner Address:", auditInfo.owner);
      if (auditInfo.owner.toLowerCase() !== wallet.address.toLowerCase()) {
        console.warn(`⚠️ Note: Wallet (${wallet.address}) is not contract owner (${auditInfo.owner})`);
      }
    }

    if (parseFloat(balanceAvax) === 0) {
      console.log(`\n⚠️ INSUFFICIENT FUNDS: Wallet ${wallet.address} has 0 AVAX.`);
      console.log(`Please claim free testnet AVAX from the Avalanche Fuji Faucet:`);
      console.log(`👉 https://core.app/tools/testnet-faucet/ (Paste address: ${wallet.address})`);
      return;
    }

    const testTicket = `GRV-${Math.floor(100000 + Math.random() * 900000)}`;
    const testCid = `QmTestAuditTrail${Date.now()}00000000000000000`;
    console.log(`\nSubmitting logEvent on-chain for ticket ${testTicket}...`);

    const result = await logAuditEvent(testTicket, testCid, "GRIEVANCE_CREATED");
    console.log("\nTransaction Result:", JSON.stringify(result, null, 2));

    if (result.txHash) {
      console.log(`\n🎉 Success! View on Snowtrace Explorer: https://testnet.snowtrace.io/tx/${result.txHash}`);
    }
  } catch (err) {
    console.error("\n❌ Test Audit Exception:", err.message);
  }
}

main();
