const mongoose = require("mongoose");
const documentSchema = new mongoose.Schema({
    documentName: {
        type: String,
        required: true,
        trim: true
    },
    documentType: {
        type: String,
        required: true,
        enum: [
            "RC",
            "Insurance",
            "Permit",
            "PUC",
            "Driving License",
            "Other"
        ]
    },
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vehicle",
        default: null
    },
    driver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Driver",
        default: null
    },
    documentNumber: {
        type: String,
        trim: true
    },
    issueDate: {
        type: Date
    },
    expiryDate: {
        type: Date
    },
    fileUrl: {
        type: String,
        required: true
    },
    publicId: {
        type: String,
        required: true
    },
    resourceType: {
        type: String,
        default: "image"
    },
    format: {
        type: String,
        required: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });
const Document = mongoose.model("Document", documentSchema);
module.exports = Document;