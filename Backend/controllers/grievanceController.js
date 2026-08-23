const Grievance = require("../models/Grievance");
const Notification = require("../models/Notification");
const errorResponse = require("../utils/errorResponse");
const { uploadJSONToIPFS, uploadFileToIPFS } = require("../utils/ipfsService");
const { logAuditEvent, getAuditInfo } = require("../blockchain/auditService");
const mongoose = require("mongoose");

// ========================
// @desc    Create new citizen grievance with Avalanche Fuji + IPFS Audit Trail
// @route   POST /api/grievances
// @access  Private (Citizen)
// ========================
const createGrievance = async (req, res) => {
  try {
    const {
      text,
      subject,
      channel,
      category,
      categoryLabel,
      dept,
      wardId,
      wardName,
      landmark,
      photo,
      priority,
      harmScore,
      officerName,
      slaDays,
    } = req.body;

    if (!text || !text.trim()) {
      return errorResponse(res, 400, "Grievance description text is required");
    }

    // Optional Athner City / Jurisdiction boundary check
    const isAthnerBoundary = wardName && wardName.toLowerCase().includes("athner");
    const targetWardName = wardName || (isAthnerBoundary ? "Athner Ward 1" : "Vijay Nagar (Ward 12)");

    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const ticketId = `GRV-${randomNum}`;
    const targetDept = dept || "Sanitation Department";

    // 1. Upload structured grievance JSON & photo to Pinata / IPFS
    const ipfsMetadata = {
      ticketId,
      category: category || "sanitation",
      categoryLabel: categoryLabel || "Sanitation & Waste",
      dept: targetDept,
      wardId: wardId || "W-12",
      wardName: targetWardName,
      priority: priority || "medium",
      harmScore: harmScore || 50,
      action: "GRIEVANCE_CREATED",
      createdAt: new Date().toISOString(),
    };

    let ipfsResult = { cid: null };
    try {
      ipfsResult = await uploadJSONToIPFS(ipfsMetadata);
    } catch (ipfsErr) {
      console.warn("⚠️ IPFS Pinning warning:", ipfsErr.message);
    }

    const ipfsCid = ipfsResult.cid || `Qm${ticketId.toLowerCase().replace(/[^a-z0-9]/g, '')}000000000000000000000000`;

    // 2. Save complaint to MongoDB with blockchainStatus: "PENDING"
    const grievance = await Grievance.create({
      citizen: req.user.userId,
      ticketId,
      text: text.trim(),
      subject: subject ? subject.trim() : "",
      channel: channel || "web",
      category: category || "sanitation",
      categoryLabel: categoryLabel || "Sanitation & Waste",
      dept: targetDept,
      wardId: wardId || "W-12",
      wardName: targetWardName,
      landmark: landmark ? landmark.trim() : "",
      photo: photo || null,
      priority: priority || "medium",
      harmScore: harmScore || 50,
      status: "assigned",
      statusHistory: [
        { status: "Submitted", updatedAt: new Date() },
        { status: "Pending", updatedAt: new Date() },
        { status: "Assigned", updatedAt: new Date() },
      ],
      officerName: officerName || "R. K. Sharma",
      slaDays: slaDays || 5,
      ipfsCid,
      blockchainStatus: "PENDING",
      blockchainNetwork: "Avalanche Fuji C-Chain (Chain 43113)",
    });

    // 3. Call logEvent on Avalanche Fuji C-Chain smart contract
    let auditLogResult = { status: "PENDING" };
    try {
      auditLogResult = await logAuditEvent(ticketId, ipfsCid, "GRIEVANCE_CREATED");
      
      if (auditLogResult.success && auditLogResult.status === "CONFIRMED") {
        grievance.blockchainTxHash = auditLogResult.txHash;
        grievance.blockNumber = auditLogResult.blockNumber;
        grievance.blockchainStatus = "CONFIRMED";
        await grievance.save();
      } else {
        grievance.blockchainStatus = auditLogResult.status || "FAILED";
        await grievance.save();
      }
    } catch (chainErr) {
      console.error("⚠️ Avalanche Fuji logEvent error:", chainErr.message);
      grievance.blockchainStatus = "FAILED";
      await grievance.save();
    }

    // Create notification for target Department
    await Notification.create({
      recipientType: "department",
      recipientId: targetDept,
      title: "New Grievance Assigned",
      message: `New grievance ${ticketId} registered in ${categoryLabel || category} for ${targetWardName}.`,
      type: "grievance_submitted",
      link: "/officer",
    });

    // Create notification for Admin
    await Notification.create({
      recipientType: "admin",
      recipientId: "admin",
      title: "New Grievance Ingested",
      message: `Grievance ${ticketId} submitted by citizen assigned to ${targetDept}.`,
      type: "grievance_submitted",
      link: "/admin",
    });

    res.status(201).json({
      success: true,
      message: "Grievance registered and logged on Avalanche Fuji audit trail",
      grievance: {
        ...grievance.toJSON(),
        ipfsCid: grievance.ipfsCid,
        blockchainTxHash: grievance.blockchainTxHash,
        blockNumber: grievance.blockNumber,
        blockchainStatus: grievance.blockchainStatus,
        blockchainNetwork: grievance.blockchainNetwork,
        snowtraceUrl: grievance.blockchainTxHash
          ? `https://testnet.snowtrace.io/tx/${grievance.blockchainTxHash}`
          : "https://testnet.snowtrace.io/address/0xbAC4712b8a43c002F9c8c1e0bE0A650b6c098B76",
      },
    });
  } catch (error) {
    console.error("Create Grievance Error:", error.message);
    return errorResponse(res, 500, "An error occurred while creating grievance");
  }
};

// ========================
// @desc    Get grievances for currently authenticated citizen
// @route   GET /api/grievances/my OR GET /api/grievances/mine
// @access  Private (Citizen)
// ========================
const getMyGrievances = async (req, res) => {
  try {
    const grievances = await Grievance.find({ citizen: req.user.userId }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      count: grievances.length,
      grievances,
    });
  } catch (error) {
    console.error("Get My Grievances Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching grievances");
  }
};

// ========================
// @desc    Get grievance count for currently authenticated citizen
// @route   GET /api/grievances/my/count
// @access  Private (Citizen)
// ========================
const getMyGrievanceCount = async (req, res) => {
  try {
    const count = await Grievance.countDocuments({ citizen: req.user.userId });
    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Get My Grievance Count Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching count");
  }
};

// ========================
// @desc    Get grievance by ID
// @route   GET /api/grievances/:id
// @access  Private (Citizen)
// ========================
const getGrievanceById = async (req, res) => {
  try {
    const { id } = req.params;
    const grievance = await Grievance.findOne({
      $or: [{ _id: id }, { ticketId: id }],
      citizen: req.user.userId,
    });

    if (!grievance) {
      return errorResponse(res, 404, "Grievance not found");
    }

    res.status(200).json({
      success: true,
      grievance,
    });
  } catch (error) {
    console.error("Get Grievance By ID Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching grievance");
  }
};

// ========================
// @desc    Update grievance
// @route   PUT /api/grievances/:id
// @access  Private (Citizen)
// ========================
const updateGrievance = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ["text", "subject", "landmark", "photo", "category", "wardId", "status"];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const grievance = await Grievance.findOneAndUpdate(
      { $or: [{ _id: id }, { ticketId: id }], citizen: req.user.userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!grievance) {
      return errorResponse(res, 404, "Grievance not found or unauthorized");
    }

    res.status(200).json({
      success: true,
      message: "Grievance updated successfully",
      grievance,
    });
  } catch (error) {
    console.error("Update Grievance Error:", error.message);
    return errorResponse(res, 500, "An error occurred while updating grievance");
  }
};

// ========================
// @desc    Delete grievance
// @route   DELETE /api/grievances/:id
// @access  Private (Citizen)
// ========================
const deleteGrievance = async (req, res) => {
  try {
    const { id } = req.params;
    const grievance = await Grievance.findOneAndDelete({
      $or: [{ _id: id }, { ticketId: id }],
      citizen: req.user.userId,
    });

    if (!grievance) {
      return errorResponse(res, 404, "Grievance not found or unauthorized");
    }

    res.status(200).json({
      success: true,
      message: "Grievance deleted successfully",
    });
  } catch (error) {
    console.error("Delete Grievance Error:", error.message);
    return errorResponse(res, 500, "An error occurred while deleting grievance");
  }
};

// ========================
// @desc    Get live grievance stats for currently authenticated citizen
// @route   GET /api/grievances/stats OR GET /api/citizen/dashboard/stats
// @access  Private (Citizen)
// ========================
const getGrievanceStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const total = await Grievance.countDocuments({ citizen: userId });
    const inProgress = await Grievance.countDocuments({
      citizen: userId,
      status: "in_progress",
    });
    const awaiting = await Grievance.countDocuments({
      citizen: userId,
      status: "closed_unverified",
    });
    const resolved = await Grievance.countDocuments({
      citizen: userId,
      status: "verified_resolved",
    });

    res.status(200).json({
      success: true,
      stats: {
        total,
        inProgress,
        awaiting,
        resolved,
      },
    });
  } catch (error) {
    console.error("Get Grievance Stats Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching grievance stats");
  }
};

// ========================
// @desc    Update grievance status (e.g. reopen or confirm)
// @route   PATCH /api/grievances/:id/status
// @access  Private (Citizen)
// ========================
const updateGrievanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "assigned",
      "in_progress",
      "closed_unverified",
      "verified_resolved",
      "reopened",
      "escalated",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return errorResponse(res, 400, "Invalid status provided");
    }

    const grievance = await Grievance.findOne({
      $or: [{ _id: id }, { ticketId: id }],
      citizen: req.user.userId,
    });

    if (!grievance) {
      return errorResponse(res, 404, "Grievance not found or unauthorized");
    }

    grievance.status = status;
    if (!grievance.statusHistory) {
      grievance.statusHistory = [];
    }
    grievance.statusHistory.push({
      status,
      updatedAt: new Date(),
    });
    await grievance.save();

    res.status(200).json({
      success: true,
      message: `Grievance status updated to ${status}`,
      grievance,
    });
  } catch (error) {
    console.error("Update Grievance Status Error:", error.message);
    return errorResponse(res, 500, "An error occurred while updating status");
  }
};

// ========================
// @desc    Get tracking timeline for a citizen grievance
// @route   GET /api/grievances/:id/tracking
// @access  Private (Citizen)
// ========================
const getGrievanceTracking = async (req, res) => {
  try {
    const { id } = req.params;
    const grievance = await Grievance.findOne({
      $or: [{ _id: id }, { ticketId: id }],
      citizen: req.user.userId,
    });

    if (!grievance) {
      return errorResponse(res, 404, "Grievance not found or unauthorized");
    }

    const defaultHistory = [
      { status: "Submitted", updatedAt: grievance.createdAt },
      { status: "Pending", updatedAt: grievance.createdAt },
      { status: grievance.status, updatedAt: grievance.updatedAt },
    ];

    const statusHistory =
      grievance.statusHistory && grievance.statusHistory.length > 0
        ? grievance.statusHistory
        : defaultHistory;

    res.status(200).json({
      success: true,
      currentStatus: grievance.status,
      statusHistory,
      departmentInfo: {
        dept: grievance.dept,
        officerName: grievance.officerName,
        wardId: grievance.wardId,
        wardName: grievance.wardName,
        slaDays: grievance.slaDays,
      },
      grievance,
    });
  } catch (error) {
    console.error("Get Grievance Tracking Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching tracking data");
  }
};

// ========================
// @desc    Get read-only Avalanche Fuji audit history for a grievance
// @route   GET /api/grievances/:id/audit
// @access  Public / Private
// ========================
const getGrievanceAudit = async (req, res) => {
  try {
    const { id } = req.params;
    const grievance = await Grievance.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(id) ? id : null },
        { ticketId: id.toUpperCase().trim() },
      ],
    });

    if (!grievance) {
      return errorResponse(res, 404, "Grievance ticket not found");
    }

    const auditInfo = await getAuditInfo(grievance.ticketId);

    res.status(200).json({
      success: true,
      ticketId: grievance.ticketId,
      ipfsCid: grievance.ipfsCid,
      ipfsGatewayUrl: grievance.ipfsCid ? `https://gateway.pinata.cloud/ipfs/${grievance.ipfsCid}` : null,
      blockchainTxHash: grievance.blockchainTxHash,
      blockNumber: grievance.blockNumber,
      blockchainStatus: grievance.blockchainStatus || "PENDING",
      blockchainNetwork: grievance.blockchainNetwork || "Avalanche Fuji C-Chain (Chain 43113)",
      snowtraceTxLink: grievance.blockchainTxHash
        ? `https://testnet.snowtrace.io/tx/${grievance.blockchainTxHash}`
        : null,
      snowtraceContractLink: `https://testnet.snowtrace.io/address/${auditInfo.contractAddress}`,
      contractAddress: auditInfo.contractAddress,
      auditInfo,
      createdAt: grievance.createdAt,
    });
  } catch (error) {
    console.error("Get Grievance Audit Error:", error.message);
    return errorResponse(res, 500, "An error occurred while fetching audit trail");
  }
};

module.exports = {
  createGrievance,
  getMyGrievances,
  getMyGrievanceCount,
  getGrievanceById,
  updateGrievance,
  deleteGrievance,
  getGrievanceStats,
  updateGrievanceStatus,
  getGrievanceTracking,
  getGrievanceAudit,
};
