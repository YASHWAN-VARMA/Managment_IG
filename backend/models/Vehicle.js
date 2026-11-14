const mongoose = require("mongoose");
const vehicleSchema = new mongoose.Schema({
    vehicleNumber : {
        type : String,
        required : true,
        unique : true
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
    currentDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    default: null
    }
},{ timestamps: true });
const Vehicle = mongoose.model("Vehicle", vehicleSchema);
module.exports = Vehicle;