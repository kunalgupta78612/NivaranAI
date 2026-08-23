const { ethers } = require("ethers");
const auditAbi = require("./abi/NivaranAuditTrail.json");

const DEFAULT_RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
const DEFAULT_CONTRACT_ADDRESS = "0xbAC4712b8a43c002F9c8c1e0bE0A650b6c098B76";
const EXPECTED_CHAIN_ID = 43113;

/**
 * Avalanche Fuji Audit Service
 * Interacts with deployed NivaranAuditTrail contract on Avalanche Fuji C-Chain (Chain ID: 43113).
 */

function getRpcUrl() {
  return process.env.AVALANCHE_FUJI_RPC_URL || DEFAULT_RPC_URL;
}

function getContractAddress() {
  return (
    process.env.NIVARAN_AUDIT_CONTRACT_ADDRESS ||
    DEFAULT_CONTRACT_ADDRESS
  ).trim();
}

function getPrivateKey() {
  let key = (process.env.AVALANCHE_PRIVATE_KEY || "").trim();
  key = key.replace(/^["']|["']$/g, "").trim();

  if (key && (key.length === 42 || (key.startsWith("0x") && key.length === 42))) {
    console.warn(
      `⚠️ [Avalanche Fuji] AVALANCHE_PRIVATE_KEY in Backend/.env (${key.slice(0, 6)}...${key.slice(-4)}) is a Public Wallet Address, NOT a 64-character Private Key.`
    );
  }

  if (key && !key.startsWith("0x") && key.length === 64) {
    key = "0x" + key;
  }
  return key;
}

/**
 * Get ethers Provider initialized for Avalanche Fuji
 */
function getProvider() {
  const rpcUrl = getRpcUrl();
  return new ethers.JsonRpcProvider(rpcUrl, {
    chainId: EXPECTED_CHAIN_ID,
    name: "avalanche-fuji",
  });
}

/**
 * Log an audit event on Avalanche Fuji C-Chain
 * Calls logEvent(string ticketId, string ipfsCid, string action)
 *
 * @param {string} ticketId - Complaint Ticket ID (e.g. GRV-849201)
 * @param {string} ipfsCid - IPFS CID of complaint metadata JSON
 * @param {string} action - Action label (e.g. "GRIEVANCE_CREATED", "STATUS_UPDATED")
 * @returns {Promise<{
 *   success: boolean,
 *   txHash?: string,
 *   blockNumber?: number,
 *   status: "CONFIRMED" | "FAILED" | "PENDING" | "NOT_CONFIGURED",
 *   error?: string
 * }>}
 */
async function logAuditEvent(ticketId, ipfsCid, action = "GRIEVANCE_CREATED") {
  const privateKey = getPrivateKey();
  const contractAddress = getContractAddress();

  const cleanKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  if (!privateKey || cleanKey.length !== 64) {
    console.warn(
      `⚠️ [Avalanche Fuji] AVALANCHE_PRIVATE_KEY in Backend/.env is not a valid 64-hex character private key (length: ${cleanKey.length}). Please set a valid 64-character private key.`
    );
    return {
      success: false,
      status: "NOT_CONFIGURED",
      error: "Invalid AVALANCHE_PRIVATE_KEY length in environment variables",
    };
  }

  try {
    const provider = getProvider();

    // Confirm Provider Chain ID
    const network = await provider.getNetwork();
    const chainIdNumber = Number(network.chainId);
    if (chainIdNumber !== EXPECTED_CHAIN_ID) {
      console.warn(
        `⚠️ [Avalanche Fuji] Network chainId mismatch. Expected ${EXPECTED_CHAIN_ID}, got ${chainIdNumber}`
      );
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(contractAddress, auditAbi, wallet);

    // Verify contract owner before sending transaction
    try {
      const ownerAddress = await contract.owner();
      if (ownerAddress.toLowerCase() !== wallet.address.toLowerCase()) {
        console.error(
          `❌ [Avalanche Fuji] Wallet address ${wallet.address} is not contract owner (${ownerAddress})`
        );
        return {
          success: false,
          status: "FAILED",
          error: `Wallet ${wallet.address} is not contract owner (${ownerAddress})`,
        };
      }
    } catch (ownerErr) {
      console.warn("⚠️ Could not verify contract owner via owner():", ownerErr.message);
    }

    console.log(
      `🚀 [Avalanche Fuji] Submitting logEvent for Ticket: ${ticketId}, CID: ${ipfsCid}, Action: ${action}...`
    );

    const tx = await contract.logEvent(ticketId, ipfsCid, action);
    console.log(`⏳ [Avalanche Fuji] Tx sent: ${tx.hash}. Waiting for 1 block confirmation...`);

    const receipt = await tx.wait(1);

    console.log(
      `✅ [Avalanche Fuji] Tx Confirmed! TxHash: ${receipt.hash}, Block: ${receipt.blockNumber}`
    );

    return {
      success: true,
      status: "CONFIRMED",
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      network: "Avalanche Fuji C-Chain (Chain 43113)",
    };
  } catch (error) {
    console.error("❌ [Avalanche Fuji] Transaction failed:", error.message);
    return {
      success: false,
      status: "FAILED",
      error: error.message,
    };
  }
}

/**
 * Read audit details from contract or event logs if available
 */
async function getAuditInfo(ticketId) {
  const contractAddress = getContractAddress();
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(contractAddress, auditAbi, provider);

    const owner = await contract.owner().catch(() => null);

    return {
      contractAddress,
      owner,
      network: "Avalanche Fuji C-Chain",
      chainId: EXPECTED_CHAIN_ID,
      snowtraceUrl: `https://testnet.snowtrace.io/address/${contractAddress}`,
    };
  } catch (error) {
    return {
      contractAddress,
      network: "Avalanche Fuji C-Chain",
      chainId: EXPECTED_CHAIN_ID,
      snowtraceUrl: `https://testnet.snowtrace.io/address/${contractAddress}`,
      error: error.message,
    };
  }
}

module.exports = {
  logAuditEvent,
  getAuditInfo,
  DEFAULT_CONTRACT_ADDRESS,
  EXPECTED_CHAIN_ID,
};
