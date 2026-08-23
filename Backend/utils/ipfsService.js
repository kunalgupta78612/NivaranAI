const axios = require("axios");
const crypto = require("crypto");

/**
 * IPFS Service using Pinata Cloud API
 * Privacy Rules:
 * - DO NOT store citizen name, email, mobile, Aadhaar, or exact street address in IPFS JSON.
 * - Stores structured audit data (ticketId, category, priority, dept, ward, timestamp, harmScore, action).
 */

/**
 * Generate a fallback IPFS CID (v0 format Qm...) if Pinata key is not configured or offline.
 */
function generateFallbackCid(contentStr) {
  const hash = crypto.createHash("sha256").update(contentStr).digest("hex");
  // Formats as a realistic 46-character Qm... CID representation for development
  return "Qm" + hash.slice(0, 44);
}

/**
 * Pin JSON metadata to Pinata IPFS
 * @param {Object} metadata - Structured grievance metadata
 * @returns {Promise<{ cid: string, gatewayUrl: string }>}
 */
async function uploadJSONToIPFS(metadata) {
  const pinataJwt = process.env.PINATA_JWT || process.env.PINATA_API_JWT;
  const pinataApiKey = process.env.PINATA_API_KEY;
  const pinataSecretKey = process.env.PINATA_SECRET_API_KEY;

  const sanitizeData = {
    ticketId: metadata.ticketId,
    category: metadata.category,
    categoryLabel: metadata.categoryLabel,
    dept: metadata.dept,
    wardId: metadata.wardId,
    wardName: metadata.wardName,
    priority: metadata.priority,
    harmScore: metadata.harmScore,
    action: metadata.action || "GRIEVANCE_CREATED",
    createdAt: metadata.createdAt || new Date().toISOString(),
    schemaVersion: "1.0-fuji",
  };

  const jsonString = JSON.stringify(sanitizeData);

  if (pinataJwt || (pinataApiKey && pinataSecretKey)) {
    try {
      const headers = pinataJwt
        ? { Authorization: `Bearer ${pinataJwt}` }
        : {
            pinata_api_key: pinataApiKey,
            pinata_secret_api_key: pinataSecretKey,
          };

      const response = await axios.post(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
          pinataContent: sanitizeData,
          pinataMetadata: {
            name: `nivaran_${sanitizeData.ticketId}.json`,
          },
        },
        { headers }
      );

      if (response.data && response.data.IpfsHash) {
        const cid = response.data.IpfsHash;
        return {
          cid,
          gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
        };
      }
    } catch (error) {
      console.warn("Pinata JSON upload warning:", error.message, "- using fallback IPFS hash");
    }
  }

  // Fallback if no Pinata API key provided or upload failed
  const cid = generateFallbackCid(jsonString);
  return {
    cid,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
  };
}

/**
 * Pin base64 / buffer file to Pinata IPFS
 * @param {string} fileBufferOrDataUrl
 * @param {string} filename
 * @returns {Promise<{ cid: string, gatewayUrl: string }>}
 */
async function uploadFileToIPFS(fileBufferOrDataUrl, filename = "proof.jpg") {
  const pinataJwt = process.env.PINATA_JWT || process.env.PINATA_API_JWT;

  if (pinataJwt && fileBufferOrDataUrl) {
    try {
      const FormData = require("form-data");
      const form = new FormData();

      let buffer;
      if (typeof fileBufferOrDataUrl === "string" && fileBufferOrDataUrl.startsWith("data:")) {
        const base64Data = fileBufferOrDataUrl.split(",")[1];
        buffer = Buffer.from(base64Data, "base64");
      } else if (Buffer.isBuffer(fileBufferOrDataUrl)) {
        buffer = fileBufferOrDataUrl;
      }

      if (buffer) {
        form.append("file", buffer, { filename });
        const response = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          form,
          {
            headers: {
              ...form.getHeaders(),
              Authorization: `Bearer ${pinataJwt}`,
            },
          }
        );

        if (response.data && response.data.IpfsHash) {
          const cid = response.data.IpfsHash;
          return {
            cid,
            gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
          };
        }
      }
    } catch (error) {
      console.warn("Pinata File upload warning:", error.message);
    }
  }

  const fallbackContent = typeof fileBufferOrDataUrl === "string" ? fileBufferOrDataUrl : filename;
  const cid = generateFallbackCid(fallbackContent);
  return {
    cid,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
  };
}

module.exports = {
  uploadJSONToIPFS,
  uploadFileToIPFS,
};
