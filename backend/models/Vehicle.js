const mongoose = require("mongoose");
const vehicleSchema = new mongoose.Schema({
    vehicleNumber : {
        type : String,
        required : true,
        unique : true,
        trim: true,
        uppercase: true
    },
    vehicleType: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["Active", "Inactive", "Maintenance"],
        default: "Active"
    },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    registrationStatus: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Approved" },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: "" },
    currentDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    default: null
    }
},{ timestamps: true });
const Vehicle = mongoose.model("Vehicle", vehicleSchema);
module.exports = Vehicle;