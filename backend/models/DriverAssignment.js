const mongoose = require("mongoose");

const driverAssignmentSchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        required: true
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
        required: true
    },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignmentNote: { type: String, trim: true, default: "" },
    assignedDate: {
        type: Date,
        default: Date.now
    },
    releasedDate: {
        type: Date,
        default: null
    }

},{ timestamps: true });
const DriverAssignment = mongoose.model(
    "DriverAssignment",
    driverAssignmentSchema
);
module.exports = DriverAssignment;