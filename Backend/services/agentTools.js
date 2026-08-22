/**
 * ============================================================================
 *  Nivaran AI — Agent Tool Layer
 * ============================================================================
 *  These are the things the bot can DO, not just say. Each tool is a real
 *  mutation against the same models the portals use, so anything the agent
 *  does shows up instantly on the Officer Kanban and the Commissioner console.
 *
 *  Every tool:
 *    - declares a JSON Schema the LLM can call with (provider-agnostic),
 *    - is executed server-side with the citizen's own session (no privilege
 *      escalation — the agent can only touch that citizen's tickets),
 *    - writes a block to the tamper-evident ledger, so the AI itself is
 *      auditable. An unaudited agent would be a hole in this platform's
 *      own accountability argument.
 * ============================================================================
 */

const Grievance = require("../models/Grievance");
const Notification = require("../models/Notification");
const chain = require("./chain");
const brain = require("./civicBrain");
const { assessPlausibility } = require("./plausibility");

/* --------------------------------------------------------------------------
 * helpers
 * ------------------------------------------------------------------------ */

function makeTicketId() {
  return `GRV-${Math.floor(100000 + Math.random() * 900000)}`;
}

function daysBetween(a, b) {
  return Math.floor((a - b) / 86400000);
}

/** Human-readable SLA state for any ticket. */
function slaState(g) {
  const due = g.slaDueAt ? new Date(g.slaDueAt) : new Date(new Date(g.createdAt).getTime() + (g.slaDays || 5) * 86400000);
  const now = new Date();
  const overdueDays = daysBetween(now, due);
  const closed = ["verified_resolved"].includes(g.status);
  return {
    dueAt: due,
    breached: !closed && now > due,
    overdueDays: overdueDays > 0 ? overdueDays : 0,
    daysLeft: overdueDays < 0 ? Math.abs(overdueDays) : 0,
  };
}

function publicTicket(g) {
  const sla = slaState(g);
  return {
    ticketId: g.ticketId,
    text: g.text,
    category: g.categoryLabel || g.category,
    dept: g.dept,
    ward: g.wardName || g.wardId,
    status: g.status,
    priority: g.priority,
    harmScore: g.harmScore,
    officerName: g.officerName || "Unassigned",
    slaDays: g.slaDays,
    slaDueAt: sla.dueAt,
    slaBreached: sla.breached,
    overdueDays: sla.overdueDays,
    daysLeft: sla.daysLeft,
    reopenCount: g.reopenCount || 0,
    supportCount: g.supportCount || 0,
    escalationLevel: g.escalationLevel || 0,
    createdAt: g.createdAt,
    auditHash: g.auditHash,
  };
}

const ESCALATION_LADDER = ["Ground Officer", "Zonal Officer", "City Commissioner"];

/* ==========================================================================
 * TOOL 1 — file_grievance
 * ========================================================================== */

const fileGrievance = {
  name: "file_grievance",
  description:
    "File a NEW civic grievance for the citizen. Only call this once you know what the problem is and roughly where it is. " +
    "The severity, department, priority and SLA are computed server-side by the civic engine — never guess them.",
  parameters: {
    type: "object",
    properties: {
      description: {
        type: "string",
        description: "The citizen's complaint in their own words. Keep their original language.",
      },
      locality: {
        type: "string",
        description: "Area, colony, ward or landmark, e.g. 'Vijay Nagar' or 'ward 22'. Pass whatever the citizen said.",
      },
      landmark: { type: "string", description: "Nearest landmark, if mentioned." },
      hasPhoto: { type: "boolean", description: "True if the citizen attached a photo." },
    },
    required: ["description"],
  },
  async run(input, ctx) {
    const description = String(input.description || "").trim();
    if (description.length < 8) {
      return { ok: false, error: "Description too short to file a valid ticket. Ask the citizen what exactly is wrong." };
    }

    // Plausibility gate — refuse to put a fake, gibberish, or off-topic
    // "report" in front of a real officer. Heuristic layer is instant and
    // always on; the semantic layer (an LLM second opinion) only runs when a
    // provider is configured, and fails OPEN so a flaky key never blocks a
    // genuine citizen.
    const plausibility = await assessPlausibility(description);
    if (!plausibility.plausible) {
      return {
        ok: false,
        needsClarification: true,
        verdict: plausibility.verdict,
        checkedBy: plausibility.checkedBy,
        error: plausibility.reason || "This does not read as a real, describable civic problem yet.",
      };
    }

    const combined = `${description} ${input.locality || ""} ${input.landmark || ""}`;
    const ward = brain.extractWard(combined) || { wardId: "W-12", wardName: "Vijay Nagar (Ward 12)" };

    // Score the complete picture: the citizen often supplies the risk-defining
    // detail ("school ke saamne") in a later turn when answering "where?".
    // Scoring only the first message under-rates every multi-turn complaint.
    const scoringText = combined.trim();
    const category = brain.classifyCategory(scoringText);
    const since = new Date(Date.now() - 14 * 86400000);
    const velocity = await Grievance.countDocuments({
      category: category.key,
      wardId: ward.wardId,
      createdAt: { $gte: since },
    });

    const assessment = brain.computeHarmScore({
      text: scoringText,
      category,
      velocity,
      photo: !!input.hasPhoto,
    });

    const ticketId = makeTicketId();
    const slaDueAt = new Date(Date.now() + assessment.slaDays * 86400000);

    const grievance = await Grievance.create({
      citizen: ctx.userId,
      ticketId,
      text: description,
      subject: category.label,
      channel: ctx.channel || "web",
      category: category.key,
      categoryLabel: category.label,
      dept: category.dept,
      wardId: ward.wardId,
      wardName: ward.wardName,
      landmark: String(input.landmark || brain.extractLandmark(combined) || "").trim(),
      priority: assessment.priority,
      harmScore: assessment.harmScore,
      harmBreakdown: assessment.stages,
      slaDays: assessment.slaDays,
      slaDueAt,
      status: "assigned",
      filedByAgent: true,
      plausibility: {
        verdict: plausibility.verdict,
        confidence: plausibility.confidence,
        checkedBy: plausibility.checkedBy,
      },
      statusHistory: [
        { status: "Submitted via Nivaran AI Agent", updatedAt: new Date() },
        { status: "Classified & Routed", updatedAt: new Date() },
        { status: "Assigned", updatedAt: new Date() },
      ],
    });

    const block = await chain.append({
      eventType: "grievance_filed",
      ticketId,
      actor: `agent:nivaran-bot(citizen:${ctx.userId})`,
      actorRole: "agent",
      agentGenerated: true,
      summary: `AI agent filed ${ticketId} — ${category.label}, ${assessment.priority} priority (harm ${assessment.harmScore}) routed to ${category.dept}`,
      payload: {
        wardId: ward.wardId,
        harmScore: assessment.harmScore,
        priority: assessment.priority,
        slaDays: assessment.slaDays,
        velocity,
      },
    });

    if (block.ok) {
      grievance.auditHash = block.hash;
      await grievance.save();
    }

    await Notification.create({
      recipientType: "department",
      recipientId: category.dept,
      title: assessment.priority === "critical" ? "CRITICAL grievance assigned" : "New grievance assigned",
      message: `${ticketId} — ${category.label} in ${ward.wardName}. Harm score ${assessment.harmScore}. SLA ${assessment.slaDays}d.`,
      type: "grievance_submitted",
      link: "/officer",
    }).catch(() => {});

    await Notification.create({
      recipientType: "admin",
      recipientId: "admin",
      title: "Grievance ingested via AI agent",
      message: `${ticketId} auto-classified as ${category.label} (${assessment.priority}).`,
      type: "grievance_submitted",
      link: "/admin",
    }).catch(() => {});

    return {
      ok: true,
      action: "filed",
      ticket: publicTicket(grievance),
      assessment: {
        harmScore: assessment.harmScore,
        priority: assessment.priority,
        category: category.label,
        dept: category.dept,
        slaDays: assessment.slaDays,
        confidence: category.confidence,
        stages: assessment.stages,
        velocity,
      },
      auditHash: block.hash || null,
    };
  },
};

/* ==========================================================================
 * TOOL 2 — find_similar_grievances  (duplicate -> democratic signal)
 * ========================================================================== */

const findSimilar = {
  name: "find_similar_grievances",
  description:
    "Before filing, check whether neighbours already reported this exact problem in the same ward. " +
    "If matches come back, OFFER the citizen the choice to join the existing ticket instead of filing a duplicate.",
  parameters: {
    type: "object",
    properties: {
      description: { type: "string", description: "What the citizen is reporting." },
      locality: { type: "string", description: "Area or ward mentioned by the citizen." },
    },
    required: ["description"],
  },
  async run(input, ctx) {
    const description = String(input.description || "");
    const category = brain.classifyCategory(description);
    const ward = brain.extractWard(`${description} ${input.locality || ""}`);

    const query = {
      category: category.key,
      status: { $nin: ["verified_resolved", "rejected"] },
      createdAt: { $gte: new Date(Date.now() - 30 * 86400000) },
    };
    if (ward) query.wardId = ward.wardId;

    const matches = await Grievance.find(query).sort({ createdAt: -1 }).limit(5).lean();

    // Exclude tickets the citizen already owns or already supports
    const others = matches.filter(
      (m) =>
        String(m.citizen) !== String(ctx.userId) &&
        !(m.supporters || []).some((s) => String(s.citizen) === String(ctx.userId))
    );

    return {
      ok: true,
      category: category.label,
      ward: ward ? ward.wardName : "unspecified",
      count: others.length,
      matches: others.map((m) => ({
        ticketId: m.ticketId,
        text: String(m.text).slice(0, 140),
        status: m.status,
        supportCount: m.supportCount || 0,
        daysOpen: daysBetween(new Date(), new Date(m.createdAt)),
        priority: m.priority,
      })),
    };
  },
};

/* ==========================================================================
 * TOOL 3 — join_grievance  (co-sign instead of duplicate)
 * ========================================================================== */

const joinGrievance = {
  name: "join_grievance",
  description:
    "Add this citizen as a co-reporter on an existing ticket. This raises the reporting-velocity signal, which " +
    "recomputes the harm score upward and re-prioritises the ticket. Use only after the citizen agrees to join.",
  parameters: {
    type: "object",
    properties: {
      ticketId: { type: "string", description: "The ticket to join, e.g. GRV-123456." },
    },
    required: ["ticketId"],
  },
  async run(input, ctx) {
    const ticketId = String(input.ticketId || "").toUpperCase().trim();
    const g = await Grievance.findOne({ ticketId });
    if (!g) return { ok: false, error: `No ticket found with id ${ticketId}.` };

    if ((g.supporters || []).some((s) => String(s.citizen) === String(ctx.userId))) {
      return { ok: false, error: "You have already joined this ticket.", ticket: publicTicket(g) };
    }
    if (String(g.citizen) === String(ctx.userId)) {
      return { ok: false, error: "This is already your own ticket.", ticket: publicTicket(g) };
    }

    g.supporters.push({ citizen: ctx.userId, joinedAt: new Date(), via: "agent" });
    g.supportCount = g.supporters.length;

    // Recompute harm with the new velocity — more neighbours means more harm.
    // Score the same full context the ticket was originally filed with,
    // otherwise the landmark/ward risk signal is lost on recompute.
    const scoringText = [g.text, g.landmark, g.wardName].filter(Boolean).join(" ");
    const recomputed = brain.computeHarmScore({
      text: scoringText,
      category: brain.classifyCategory(scoringText),
      velocity: g.supportCount,
      photo: !!g.photo,
      reopenCount: g.reopenCount || 0,
    });

    const before = { harmScore: g.harmScore, priority: g.priority };

    // Monotonic guard: co-signing is additional evidence of harm. It must
    // never be able to DOWNGRADE a ticket — a citizen offering support should
    // not accidentally de-prioritise their neighbour's critical complaint.
    const RANK = { low: 0, medium: 1, high: 2, critical: 3 };
    g.harmScore = Math.max(g.harmScore || 0, recomputed.harmScore);
    g.priority = RANK[recomputed.priority] > RANK[g.priority] ? recomputed.priority : g.priority;
    g.harmBreakdown = recomputed.stages;
    g.statusHistory.push({
      status: `Co-signed by another citizen (${g.supportCount} total) — priority recalculated`,
      updatedAt: new Date(),
    });
    await g.save();

    const block = await chain.append({
      eventType: "support_added",
      ticketId,
      actor: `agent:nivaran-bot(citizen:${ctx.userId})`,
      actorRole: "agent",
      agentGenerated: true,
      summary: `Citizen co-signed ${ticketId}. Support count ${g.supportCount}. Harm ${before.harmScore} → ${g.harmScore}.`,
      payload: { before, after: { harmScore: g.harmScore, priority: g.priority }, supportCount: g.supportCount },
    });

    return {
      ok: true,
      action: "joined",
      ticket: publicTicket(g),
      escalatedPriority: before.priority !== g.priority,
      before,
      after: { harmScore: g.harmScore, priority: g.priority },
      auditHash: block.hash || null,
    };
  },
};

/* ==========================================================================
 * TOOL 4 — track_grievance
 * ========================================================================== */

const trackGrievance = {
  name: "track_grievance",
  description:
    "Look up the citizen's ticket(s) and their live SLA position. Call with a ticketId if the citizen gave one, " +
    "otherwise call with no arguments to get their most recent tickets.",
  parameters: {
    type: "object",
    properties: {
      ticketId: { type: "string", description: "Specific ticket id like GRV-123456. Omit to list recent tickets." },
    },
    required: [],
  },
  async run(input, ctx) {
    const ticketId = String(input.ticketId || "").toUpperCase().trim();

    if (ticketId) {
      const g = await Grievance.findOne({ ticketId, citizen: ctx.userId });
      if (!g) return { ok: false, error: `No ticket ${ticketId} found under your account.` };
      return { ok: true, ticket: publicTicket(g), timeline: g.statusHistory || [] };
    }

    const list = await Grievance.find({ citizen: ctx.userId }).sort({ createdAt: -1 }).limit(5);
    if (!list.length) {
      return { ok: true, count: 0, tickets: [], message: "This citizen has not filed any grievance yet." };
    }
    return { ok: true, count: list.length, tickets: list.map(publicTicket) };
  },
};

/* ==========================================================================
 * TOOL 5 — reopen_and_escalate   (the "resolution trap" enforcement)
 * ========================================================================== */

const reopenAndEscalate = {
  name: "reopen_and_escalate",
  description:
    "Reject an officer's claimed resolution. Reopens the ticket, raises priority, increments the officer's reopen " +
    "count (which lowers their integrity score) and, if the SLA is already breached, escalates up the ladder. " +
    "Use when the citizen says the problem is still not fixed.",
  parameters: {
    type: "object",
    properties: {
      ticketId: { type: "string", description: "Ticket to reopen." },
      reason: { type: "string", description: "Why the citizen says it is not resolved." },
    },
    required: ["ticketId"],
  },
  async run(input, ctx) {
    const ticketId = String(input.ticketId || "").toUpperCase().trim();
    const g = await Grievance.findOne({ ticketId, citizen: ctx.userId });
    if (!g) return { ok: false, error: `No ticket ${ticketId} found under your account.` };

    if (g.status === "verified_resolved") {
      return { ok: false, error: "You already confirmed this ticket as resolved. Reopening needs a fresh complaint." };
    }

    const sla = slaState(g);
    const reason = String(input.reason || "Citizen states the issue persists.").trim();

    g.reopenCount = (g.reopenCount || 0) + 1;
    g.status = "reopened";
    g.priority = g.priority === "critical" ? "critical" : g.priority === "high" ? "critical" : "high";

    // Escalate a level if the SLA is blown or this is a repeat failure
    let escalated = false;
    if (sla.breached || g.reopenCount >= 2) {
      g.escalationLevel = Math.min(2, (g.escalationLevel || 0) + 1);
      g.status = "escalated";
      escalated = true;
    }

    g.statusHistory.push({ status: `Reopened by citizen — ${reason}`, updatedAt: new Date() });
    if (escalated) {
      g.statusHistory.push({
        status: `Escalated to ${ESCALATION_LADDER[g.escalationLevel]}`,
        updatedAt: new Date(),
      });
    }
    await g.save();

    const block = await chain.append({
      eventType: escalated ? "escalated" : "citizen_reopened",
      ticketId,
      actor: `agent:nivaran-bot(citizen:${ctx.userId})`,
      actorRole: "agent",
      agentGenerated: true,
      summary: escalated
        ? `${ticketId} reopened (#${g.reopenCount}) and escalated to ${ESCALATION_LADDER[g.escalationLevel]}. SLA breached by ${sla.overdueDays}d.`
        : `${ticketId} reopened by citizen (#${g.reopenCount}). Officer integrity impacted.`,
      payload: { reason, reopenCount: g.reopenCount, slaBreached: sla.breached, overdueDays: sla.overdueDays },
    });

    await Notification.create({
      recipientType: "department",
      recipientId: g.dept,
      title: escalated ? "ESCALATED — resolution rejected" : "Ticket reopened by citizen",
      message: `${ticketId}: ${reason}`,
      type: "status_updated",
      link: "/officer",
    }).catch(() => {});

    await Notification.create({
      recipientType: "admin",
      recipientId: "admin",
      title: "Ghost-closure caught",
      message: `${ticketId} was marked resolved but the citizen rejected it. Officer ${g.officerName} reopen count now ${g.reopenCount}.`,
      type: "status_updated",
      link: "/admin",
    }).catch(() => {});

    return {
      ok: true,
      action: escalated ? "escalated" : "reopened",
      ticket: publicTicket(g),
      escalatedTo: escalated ? ESCALATION_LADDER[g.escalationLevel] : null,
      officerImpact: `${g.officerName || "The assigned officer"} — reopen count now ${g.reopenCount}, integrity score reduced`,
      slaBreached: sla.breached,
      overdueDays: sla.overdueDays,
      auditHash: block.hash || null,
    };
  },
};

/* ==========================================================================
 * TOOL 6 — verify_resolved
 * ========================================================================== */

const verifyResolved = {
  name: "verify_resolved",
  description: "Citizen confirms the work was actually done. Closes the ticket as verified and credits the officer.",
  parameters: {
    type: "object",
    properties: { ticketId: { type: "string", description: "Ticket to confirm as genuinely resolved." } },
    required: ["ticketId"],
  },
  async run(input, ctx) {
    const ticketId = String(input.ticketId || "").toUpperCase().trim();
    const g = await Grievance.findOne({ ticketId, citizen: ctx.userId });
    if (!g) return { ok: false, error: `No ticket ${ticketId} found under your account.` };

    g.status = "verified_resolved";
    g.statusHistory.push({ status: "Citizen verified resolution", updatedAt: new Date() });
    await g.save();

    const block = await chain.append({
      eventType: "citizen_verified",
      ticketId,
      actor: `agent:nivaran-bot(citizen:${ctx.userId})`,
      actorRole: "agent",
      agentGenerated: true,
      summary: `${ticketId} confirmed genuinely resolved by the citizen. ${g.officerName || "Assigned officer"} credited.`,
      payload: { officerName: g.officerName },
    });

    return { ok: true, action: "verified", ticket: publicTicket(g), auditHash: block.hash || null };
  },
};

/* ==========================================================================
 * TOOL 7 — explain_entitlement   (what the state actually owes this citizen)
 * ========================================================================== */

const explainEntitlement = {
  name: "explain_entitlement",
  description:
    "Explain what the citizen is legally owed: which department is responsible, the SLA in days, where their " +
    "ticket currently stands against that SLA, and what remedy they can demand next. Use for 'kitne din', " +
    "'who is responsible', 'what are my rights' style questions.",
  parameters: {
    type: "object",
    properties: {
      ticketId: { type: "string", description: "Ticket to assess, if the citizen has one." },
      problemType: { type: "string", description: "If no ticket, the kind of problem they are asking about." },
    },
    required: [],
  },
  async run(input, ctx) {
    const ticketId = String(input.ticketId || "").toUpperCase().trim();

    if (ticketId) {
      const g = await Grievance.findOne({ ticketId, citizen: ctx.userId });
      if (!g) return { ok: false, error: `No ticket ${ticketId} found under your account.` };
      const sla = slaState(g);
      const remedies = [];
      if (sla.breached) {
        remedies.push(`Demand escalation to ${ESCALATION_LADDER[Math.min(2, (g.escalationLevel || 0) + 1)]}`);
        remedies.push("File an RTI asking what action was taken and by whom (30-day statutory reply)");
        remedies.push("Cite the on-chain audit hash as tamper-proof evidence of the delay");
      } else {
        remedies.push(`Wait until ${sla.dueAt.toDateString()} — the department is still inside its SLA`);
      }
      return {
        ok: true,
        ticketId,
        dept: g.dept,
        officer: g.officerName,
        slaDays: g.slaDays,
        dueAt: sla.dueAt,
        breached: sla.breached,
        overdueDays: sla.overdueDays,
        daysLeft: sla.daysLeft,
        escalationPath: ESCALATION_LADDER,
        currentLevel: ESCALATION_LADDER[g.escalationLevel || 0],
        remedies,
        auditHash: g.auditHash,
      };
    }

    const cat = brain.classifyCategory(String(input.problemType || ""));
    return {
      ok: true,
      dept: cat.dept,
      category: cat.label,
      slaDays: cat.slaDays,
      escalationPath: ESCALATION_LADDER,
      remedies: [
        `${cat.dept} must act within ${cat.slaDays} working days of a registered complaint`,
        "If they miss it, escalation to the Zonal Officer can be demanded immediately",
        "An RTI application must be answered within 30 days under the RTI Act, 2005",
      ],
    };
  },
};

/* ==========================================================================
 * TOOL 8 — draft_escalation_letter
 * ========================================================================== */

const draftEscalationLetter = {
  name: "draft_escalation_letter",
  description:
    "Generate a formal escalation letter or RTI application for a breached ticket, citing the on-chain audit hash " +
    "as tamper-proof evidence. Use when the SLA is blown and the citizen wants to push it further.",
  parameters: {
    type: "object",
    properties: {
      ticketId: { type: "string", description: "The breached ticket." },
      mode: {
        type: "string",
        enum: ["escalation", "rti"],
        description: "'escalation' for a letter to the next authority, 'rti' for an RTI application.",
      },
    },
    required: ["ticketId"],
  },
  async run(input, ctx) {
    const ticketId = String(input.ticketId || "").toUpperCase().trim();
    const mode = input.mode === "rti" ? "rti" : "escalation";
    const g = await Grievance.findOne({ ticketId, citizen: ctx.userId }).populate("citizen", "fullName address city state pincode");
    if (!g) return { ok: false, error: `No ticket ${ticketId} found under your account.` };

    const sla = slaState(g);
    const citizen = g.citizen || {};
    const today = new Date().toDateString();
    const nextAuthority = ESCALATION_LADDER[Math.min(2, (g.escalationLevel || 0) + 1)];

    let letter;
    if (mode === "rti") {
      letter = [
        "APPLICATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005",
        "",
        `To,\nThe Public Information Officer\n${g.dept}\nIndore Municipal Corporation, Madhya Pradesh`,
        "",
        `Date: ${today}`,
        `Subject: Information sought regarding unresolved civic grievance ${g.ticketId}`,
        "",
        "Sir/Madam,",
        "",
        `I, ${citizen.fullName || "the undersigned"}, a resident of ${citizen.address || g.wardName}, ` +
          `registered grievance ${g.ticketId} on ${new Date(g.createdAt).toDateString()} regarding: "${g.text}".`,
        "",
        `The prescribed service level for this category is ${g.slaDays} day(s). The complaint is now overdue by ` +
          `${sla.overdueDays} day(s). The grievance record carries the tamper-evident audit reference ` +
          `${g.auditHash || "(pending)"}, which cannot be altered retrospectively.`,
        "",
        "I therefore request the following information:",
        "1. The name and designation of the officer to whom this grievance was assigned.",
        "2. The dates and nature of every action taken on this grievance to date.",
        "3. The reason for the delay beyond the prescribed service level.",
        "4. The date by which the grievance will be redressed.",
        "5. Details of action taken, if any, against the officer for the delay.",
        "",
        "The requisite application fee is enclosed. Kindly furnish the information within the 30-day statutory period.",
        "",
        `Yours faithfully,\n${citizen.fullName || ""}\n${citizen.address || ""}\n${citizen.city || "Indore"}, ${citizen.state || "Madhya Pradesh"} ${citizen.pincode || ""}`,
      ].join("\n");
    } else {
      letter = [
        `To,\nThe ${nextAuthority}\nIndore Municipal Corporation, Madhya Pradesh`,
        "",
        `Date: ${today}`,
        `Subject: Escalation of grievance ${g.ticketId} — service level breached by ${sla.overdueDays} day(s)`,
        "",
        "Respected Sir/Madam,",
        "",
        `I registered grievance ${g.ticketId} on ${new Date(g.createdAt).toDateString()} with the ${g.dept} ` +
          `concerning: "${g.text}" at ${g.wardName}.`,
        "",
        `The assessed severity of this grievance is ${g.harmScore}/100 (${g.priority} priority) and the prescribed ` +
          `resolution window was ${g.slaDays} day(s), expiring on ${sla.dueAt.toDateString()}. As of today the ` +
          `grievance remains unresolved, ${sla.overdueDays} day(s) beyond that deadline.`,
        g.reopenCount
          ? `\nThis grievance was previously marked resolved and reopened ${g.reopenCount} time(s) after inspection showed the work had not been carried out.`
          : "",
        "",
        `The complete action history is recorded on the corporation's tamper-evident audit ledger under reference ` +
          `${g.auditHash || "(pending)"}. This record cannot be modified retrospectively.`,
        "",
        "I request that this grievance be taken up at your level and that I be informed of the action taken and the " +
          "revised timeline for redressal.",
        "",
        `Yours faithfully,\n${citizen.fullName || ""}\n${citizen.address || ""}\n${citizen.city || "Indore"}, ${citizen.state || "Madhya Pradesh"} ${citizen.pincode || ""}`,
      ].join("\n");
    }

    await chain.append({
      eventType: "agent_action",
      ticketId,
      actor: `agent:nivaran-bot(citizen:${ctx.userId})`,
      actorRole: "agent",
      agentGenerated: true,
      summary: `AI agent generated a ${mode === "rti" ? "Right to Information application" : "formal escalation letter"} for ${ticketId}.`,
      payload: { mode, overdueDays: sla.overdueDays },
    });

    return {
      ok: true,
      action: "letter_drafted",
      mode,
      ticketId,
      addressedTo: mode === "rti" ? `Public Information Officer, ${g.dept}` : nextAuthority,
      overdueDays: sla.overdueDays,
      letter,
      filename: `${mode === "rti" ? "RTI" : "Escalation"}_${g.ticketId}.txt`,
    };
  },
};

/* ==========================================================================
 * TOOL 9 — emergency_protocol
 * ========================================================================== */

const emergencyProtocol = {
  name: "emergency_protocol",
  description:
    "Call IMMEDIATELY and BEFORE anything else if the citizen describes a life-threatening situation: gas leak, " +
    "fire, live electrical wire, building collapse, drowning, or an injured person. Returns emergency numbers and " +
    "files a critical ticket in parallel. Never tell someone in danger to wait for a ticket.",
  parameters: {
    type: "object",
    properties: {
      description: { type: "string", description: "What is happening." },
      locality: { type: "string", description: "Where it is happening." },
    },
    required: ["description"],
  },
  async run(input, ctx) {
    const description = String(input.description || "");
    const emergency = brain.detectEmergency(description);
    const combined = `${description} ${input.locality || ""}`;
    const ward = brain.extractWard(combined) || { wardId: "W-12", wardName: "Vijay Nagar (Ward 12)" };
    const category = brain.classifyCategory(description);

    const ticketId = makeTicketId();
    const g = await Grievance.create({
      citizen: ctx.userId,
      ticketId,
      text: description,
      subject: `EMERGENCY — ${category.label}`,
      channel: ctx.channel || "web",
      category: category.key,
      categoryLabel: category.label,
      dept: category.dept,
      wardId: ward.wardId,
      wardName: ward.wardName,
      priority: "critical",
      harmScore: 100,
      slaDays: 1,
      slaDueAt: new Date(Date.now() + 86400000),
      status: "escalated",
      escalationLevel: 2,
      filedByAgent: true,
      statusHistory: [
        { status: "EMERGENCY reported via Nivaran AI Agent", updatedAt: new Date() },
        { status: "Auto-escalated to City Commissioner", updatedAt: new Date() },
      ],
    });

    const block = await chain.append({
      eventType: "escalated",
      ticketId,
      actor: `agent:nivaran-bot(citizen:${ctx.userId})`,
      actorRole: "agent",
      agentGenerated: true,
      summary: `EMERGENCY (${emergency.kind || "unclassified"}) reported at ${ward.wardName}. Auto-escalated to Commissioner, harm 100.`,
      payload: { kind: emergency.kind, wardId: ward.wardId },
    });

    if (block.ok) {
      g.auditHash = block.hash;
      await g.save();
    }

    await Notification.create({
      recipientType: "admin",
      recipientId: "admin",
      title: "EMERGENCY REPORTED",
      message: `${ticketId} — ${emergency.kind || "hazard"} at ${ward.wardName}. Immediate response required.`,
      type: "status_updated",
      link: "/admin",
    }).catch(() => {});

    return {
      ok: true,
      action: "emergency",
      kind: emergency.kind || "hazard",
      emergencyNumbers: emergency.numbers || ["112 (All-in-one Emergency)", "108 (Ambulance)", "101 (Fire)"],
      instruction:
        "Tell the citizen to call these numbers RIGHT NOW and to move away from the hazard. The ticket is secondary.",
      ticket: publicTicket(g),
      auditHash: block.hash || null,
    };
  },
};

/* ==========================================================================
 * Registry + dispatcher
 * ========================================================================== */

const CITIZEN_TOOLS = [
  emergencyProtocol,
  findSimilar,
  fileGrievance,
  joinGrievance,
  trackGrievance,
  reopenAndEscalate,
  verifyResolved,
  explainEntitlement,
  draftEscalationLetter,
];

const REGISTRY = {};
for (const t of CITIZEN_TOOLS) REGISTRY[t.name] = t;

/** Schemas only — what gets sent to the LLM. */
function toolSchemas(role = "citizen") {
  const list = role === "citizen" ? CITIZEN_TOOLS : CITIZEN_TOOLS;
  return list.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters }));
}

/**
 * Execute a tool by name. Never throws — a tool failure becomes a structured
 * error the model can read and recover from in the next turn.
 */
async function execute(name, input, ctx) {
  const tool = REGISTRY[name];
  if (!tool) return { ok: false, error: `Unknown tool "${name}".` };
  if (!ctx || !ctx.userId) return { ok: false, error: "No authenticated citizen in context." };

  try {
    const started = Date.now();
    const result = await tool.run(input || {}, ctx);
    return { ...result, _tool: name, _ms: Date.now() - started };
  } catch (err) {
    console.error(`[agentTools] ${name} failed:`, err);
    return { ok: false, error: `Tool ${name} failed: ${err.message}`, _tool: name };
  }
}

module.exports = {
  toolSchemas,
  execute,
  REGISTRY,
  CITIZEN_TOOLS,
  slaState,
  publicTicket,
  ESCALATION_LADDER,
};
