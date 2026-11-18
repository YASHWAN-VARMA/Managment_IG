const mongoose = require("mongoose");
const tripSchema = new mongoose.Schema({
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
    startLocation: {
        type: String,
        required: true
    },
    endLocation: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        default: null
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: {
        type: String,
        enum: ["Ongoing", "Completed", "Cancelled"],
        default: "Ongoing"
    }
}, { timestamps: true });
const Trip = mongoose.model("Trip", tripSchema);
module.exports = Trip;