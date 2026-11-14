const mongoose = require("mongoose");
const fuelEntrySchema = new mongoose.Schema({
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        required: true
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
        default: null
    },
    trip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trip",
        default: null
    },
    quantity: {
        type: Number,
        required: true,
        min: 0.01
    },
    pricePerLitre: {
        type: Number,
        required: true,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    date: {
        type: Date,
        default: Date.now
    },
    fuelStation: {
        type: String,
        trim: true
    }
}, { timestamps: true });
const FuelEntry = mongoose.model("FuelEntry", fuelEntrySchema);
module.exports = FuelEntry;