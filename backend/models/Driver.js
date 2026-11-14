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
    status: {
        type: String,
        enum: ["Active", "Inactive"],
        default: "Active"
    }
},{timestamps:true})
const Driver = mongoose.model("Driver",driverSchema);
module.exports = Driver;