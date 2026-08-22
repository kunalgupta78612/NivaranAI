/**
 * ============================================================================
 *  Nivaran AI — On-Chain Audit Ledger
 * ============================================================================
 *  A real hash chain (SHA-256, Node's built-in crypto — no dependency) rather
 *  than a decorative "blockchain" label.
 *
 *  Block N stores hash(N-1). Recomputing the chain detects any retro-edit,
 *  including edits made directly in the database. /api/chain/verify walks the
 *  whole ledger and reports the first block where the maths stops working.
 *
 *  Why it matters for this product: the platform's core claim is that officers
 *  cannot ghost-close tickets. That claim is only credible if the record of
 *  what happened cannot be quietly rewritten afterwards.
 * ============================================================================
 */

const crypto = require("crypto");
const ChainEvent = require("../models/ChainEvent");

const GENESIS_HASH = "0".repeat(64);

/** Deterministic block hash. Key order is fixed so the hash is reproducible. */
function computeHash({ index, prevHash, eventType, ticketId, actor, summary, payload, createdAt }) {
  const canonical = JSON.stringify({
    index,
    prevHash,
    eventType,
    ticketId: ticketId || null,
    actor,
    summary,
    payload: payload || {},
    createdAt: createdAt ? new Date(createdAt).toISOString() : null,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

/**
 * Append a block. Never throws — audit logging must not be able to take down
 * the request that triggered it.
 */
async function append({
  eventType,
  ticketId = null,
  actor = "system",
  actorRole = "system",
  summary,
  payload = {},
  agentGenerated = false,
}) {
  try {
    const last = await ChainEvent.findOne().sort({ index: -1 }).lean();
    const index = last ? last.index + 1 : 0;
    const prevHash = last ? last.hash : GENESIS_HASH;
    const createdAt = new Date();

    const hash = computeHash({ index, prevHash, eventType, ticketId, actor, summary, payload, createdAt });

    const block = await ChainEvent.create({
      index,
      prevHash,
      hash,
      eventType,
      ticketId,
      actor,
      actorRole,
      summary,
      payload,
      agentGenerated,
      createdAt,
    });

    return { ok: true, hash, index, block };
  } catch (err) {
    console.error("[chain] append failed:", err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Walk the full ledger and verify every link.
 * Returns the first break, if any — that is the tamper evidence.
 */
async function verify() {
  const blocks = await ChainEvent.find().sort({ index: 1 }).lean();
  if (!blocks.length) {
    return { valid: true, length: 0, message: "Ledger is empty — nothing to verify." };
  }

  let prevHash = GENESIS_HASH;
  for (const b of blocks) {
    if (b.prevHash !== prevHash) {
      return {
        valid: false,
        length: blocks.length,
        brokenAt: b.index,
        reason: "prevHash does not match the previous block's hash",
        expected: prevHash,
        found: b.prevHash,
      };
    }

    const recomputed = computeHash({
      index: b.index,
      prevHash: b.prevHash,
      eventType: b.eventType,
      ticketId: b.ticketId,
      actor: b.actor,
      summary: b.summary,
      payload: b.payload,
      createdAt: b.createdAt,
    });

    if (recomputed !== b.hash) {
      return {
        valid: false,
        length: blocks.length,
        brokenAt: b.index,
        reason: "block contents were modified after it was written",
        expected: recomputed,
        found: b.hash,
      };
    }

    prevHash = b.hash;
  }

  return {
    valid: true,
    length: blocks.length,
    head: prevHash,
    message: `All ${blocks.length} blocks verified. Ledger is intact.`,
  };
}

async function recent(limit = 50, filter = {}) {
  return ChainEvent.find(filter).sort({ index: -1 }).limit(Math.min(200, limit)).lean();
}

module.exports = { append, verify, recent, computeHash, GENESIS_HASH };
