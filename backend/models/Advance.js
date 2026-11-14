const mongoose = require("mongoose");
const advanceSchema = new mongoose.Schema({
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    date: {
        type: Date,
        default: Date.now
    },
    purpose: {
        type: String,
        trim: true
    },
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        default: null
    },
    trip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Trip",
        default: null
    }
}, { timestamps: true });
const Advance = mongoose.model("Advance", advanceSchema);
module.exports = Advance;