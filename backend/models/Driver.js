const mongoose = require("mongoose");
const driverSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    licenseNumber: {
        type: String,
        required: true,
        unique: true
    },
    address: {
        type: String
    },
    driverType: { type: String, enum: ["Permanent", "Temporary", "One-day"], default: "Permanent" },
    availabilityEndAt: { type: Date, default: null },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    }
},{timestamps:true})
const Driver = mongoose.model("Driver",driverSchema);
module.exports = Driver;