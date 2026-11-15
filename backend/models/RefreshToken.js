const mongoose = require("mongoose");
const refreshTokenSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    tokenHash: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    revokedAt: {
        type: Date,
        default: null
    },
    replacedBy: {
        type: String,
        default: null
    },
    deviceName: {
        type: String,
        default: "Unknown device"
    }
}, { timestamps: true });
refreshTokenSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);
const RefreshToken = mongoose.model(
    "RefreshToken",
    refreshTokenSchema
);
module.exports = RefreshToken;