require("dotenv").config();
const dataBase = require("./db");
const express = require("express");
const Driver = require("./models/Driver");
const Vehicle = require("./models/Vehicle");
const DriverAssignment = require("./models/DriverAssignment");
const Trip = require("./models/Trip");
const cookieParser = require("cookie-parser");
const Advance = require("./models/Advance");
const FuelEntry = require("./models/FuelEntry");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("./config/cloudinary");
const protect = require("./middleware/auth");
const authorize = require("./middleware/authorize");
const Document = require("./models/Document");
const upload = require("./middleware/upload");
const cors = require("cors");
const userManagementRoutes = require("./routes/userManagement");
const vehicleApprovalRoutes = require("./routes/vehicleApprovals");
const {
    exportToExcel,
    exportMultipleSheets
} = require("./utils/excelExport");
const app = express();
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
const PORT = 3333;
const RefreshToken = require("./models/RefreshToken");
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} = require("./utils/tokenUtils");
app.use(express.json());
app.use(cookieParser());
app.use("/admin", userManagementRoutes);
app.use("/admin", vehicleApprovalRoutes);
app.use("/", vehicleApprovalRoutes);
app.get("/vehicles", protect, authorize("manage_vehicles"), async (req, res) => {
    try {
        const scope = req.user.role === "Admin" ? {} : { $or: [{ manager: req.user.id }, { submittedBy: req.user.id }] };
        const vehicles = await Vehicle.find(scope)
            .populate("currentDriver", "name phone")
            .populate("manager", "name");
        res.status(200).json({
            count: vehicles.length,
            vehicles: vehicles
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

app.put("/vehicles/:id", protect, authorize("manage_vehicles"), async (req,res)=>{
 try {const v=await Vehicle.findById(req.params.id);if(!v)return res.status(404).json({message:"Vehicle not found."});if(req.user.role!=="Admin"&&String(v.manager||"")!==req.user.id)return res.status(403).json({message:"You cannot edit this vehicle."});
 const allowed={vehicleNumber:req.body.vehicleNumber,vehicleType:req.body.vehicleType,model:req.body.model,status:req.body.status};for(const [k,val] of Object.entries(allowed))if(val!==undefined)v[k]=val;await v.save();res.json({message:"Vehicle updated successfully.",vehicle:v});
 }catch(e){res.status(400).json({message:e.code===11000?"Vehicle registration number already exists.":e.message});}
});
app.delete("/vehicles/:id", protect, authorize("manage_vehicles"), async (req,res)=>{
 try {const v=await Vehicle.findById(req.params.id);if(!v)return res.status(404).json({message:"Vehicle not found."});if(req.user.role!=="Admin"&&String(v.manager||"")!==req.user.id)return res.status(403).json({message:"You cannot delete this vehicle."});
 const Trip=require("./models/Trip");const used=await Trip.exists({vehicle:v._id});if(used)return res.status(409).json({message:"This vehicle has trip history. Set it to Inactive instead of deleting it."});await v.deleteOne();res.json({message:"Vehicle deleted."});}catch(e){res.status(500).json({message:"Unable to delete vehicle."});}
});
app.post("/drivers", protect, authorize("manage_drivers"), async (req, res) => {
    try{
    const payload = { ...req.body, registeredBy: req.user.id };
    const newDriver = new Driver(payload);
    const savedDriver = await newDriver.save();
    res.status(201).json({
            message: "Driver added successfully!",
            driver: savedDriver
    });
    }
    catch(error){
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/drivers", protect, authorize("manage_drivers"), async (req, res) => {
    try {
        const drivers = await Driver.find();
        res.status(200).json({
            count: drivers.length,
            drivers: drivers
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.patch("/drivers/:id/status", protect, authorize("manage_drivers"), async (req,res)=>{
 try { if(typeof req.body.isActive!=="boolean")return res.status(400).json({message:"isActive must be true or false."});const d=await Driver.findById(req.params.id);if(!d)return res.status(404).json({message:"Driver not found."});d.status=req.body.isActive?"Active":"Inactive";await d.save();res.json({message:d.status==="Active"?"Driver activated.":"Driver deactivated. Historical records are preserved.",driver:d});}catch(e){res.status(500).json({message:"Unable to update driver status."});}
});
app.post("/vehicles", protect, authorize("manage_vehicles"), async (req, res) => {
    try {
        const payload = { ...req.body, submittedBy: req.user.id, manager: req.user.role === "Admin" ? (req.body.manager || null) : null, registrationStatus: req.user.role === "Admin" ? "Approved" : "Pending", approvedBy: req.user.role === "Admin" ? req.user.id : null, approvedAt: req.user.role === "Admin" ? new Date() : null };
        if (req.user.role !== "Admin") delete payload.status;
        const newVehicle = new Vehicle(payload);
        const savedVehicle = await newVehicle.save();
        res.status(201).json({
            message: "Vehicle added successfully!",
            vehicle: savedVehicle
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post("/vehicles/:vehicleId/assign-driver", protect, authorize("manage_vehicles"), async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { driverId } = req.body;
        const vehicle = await Vehicle.findById(vehicleId);
        const driver = await Driver.findById(driverId);
        if (!vehicle || !driver) {
            return res.status(404).json({
                message: "Vehicle or driver not found"
            });
        }
        if (req.user.role !== "Admin" && String(vehicle.manager || "") !== req.user.id) return res.status(403).json({ message: "You cannot assign a driver to this vehicle." });
        if (vehicle.registrationStatus !== "Approved" || vehicle.status !== "Active") return res.status(409).json({ message: "Only approved, active vehicles can be assigned." });
        if (driver.status !== "Active") return res.status(409).json({ message: "This driver is inactive." });
        if (vehicle.currentDriver) {
            await DriverAssignment.findOneAndUpdate(
                {
                    vehicle: vehicleId,
                    driver: vehicle.currentDriver,
                    releasedDate: null
                },
                {
                    releasedDate: new Date()
                }
            );
        }
        const assignment = new DriverAssignment({
            vehicle: vehicleId,
            driver: driverId,
            assignedBy: req.user.id
        });
        await assignment.save();
        vehicle.currentDriver = driverId;
        await vehicle.save();

        res.status(200).json({
            message: "Driver assigned successfully",
            assignment
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/vehicles/:vehicleId/assignments", protect, authorize("manage_vehicles"), async (req, res) => {
    try {
        const targetVehicle = await Vehicle.findById(req.params.vehicleId);
        if (!targetVehicle) return res.status(404).json({ message: "Vehicle not found." });
        if (req.user.role !== "Admin" && String(targetVehicle.manager || "") !== req.user.id) return res.status(403).json({ message: "You cannot view this vehicle." });
        const assignments = await DriverAssignment.find({
            vehicle: req.params.vehicleId
        })
        .populate("driver", "name phone licenseNumber")
        .sort({ assignedDate: 1 });

        res.status(200).json({
            count: assignments.length,
            assignments
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post("/trips", protect, authorize("manage_trips"), async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.body.vehicle);
        const driver = await Driver.findById(req.body.driver);
        if (!vehicle || !driver) return res.status(404).json({ message: "Vehicle or driver not found." });
        if (vehicle.registrationStatus !== "Approved" || vehicle.status !== "Active") return res.status(409).json({ message: "Vehicle must be approved and active before creating a trip." });
        if (driver.status !== "Active") return res.status(409).json({ message: "Driver is inactive." });
        if (req.user.role !== "Admin" && String(vehicle.manager || "") !== req.user.id) return res.status(403).json({ message: "This vehicle is not assigned to your account." });
        const newTrip = new Trip({ ...req.body, createdBy: req.user.id });
        const savedTrip = await newTrip.save();
        res.status(201).json({
            message: "Trip created successfully",
            trip: savedTrip
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/trips", protect, authorize("manage_trips"), async (req, res) => {
    try {
        const tripFilter = req.user.role === "Admin" ? {} : { vehicle: { $in: await Vehicle.find({ manager: req.user.id }).distinct("_id") } };
        const trips = await Trip.find(tripFilter)
            .populate("vehicle", "vehicleNumber model manager")
            .populate("driver", "name phone");
        res.status(200).json({
            count: trips.length,
            trips
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.put("/trips/:id/complete", protect, authorize("manage_trips"), async (req, res) => {
    try {
        const existingTrip = await Trip.findById(req.params.id).populate("vehicle", "manager");
        if (!existingTrip) return res.status(404).json({ message: "Trip not found" });
        if (req.user.role !== "Admin" && String(existingTrip.vehicle?.manager || "") !== req.user.id) return res.status(403).json({ message: "You cannot update this trip." });
        existingTrip.status = "Completed"; existingTrip.endDate = new Date(); await existingTrip.save();
        const updatedTrip = existingTrip;
        if (!updatedTrip) {
            return res.status(404).json({
                message: "Trip not found"
            });
        }
        res.status(200).json({
            message: "Trip completed successfully",
            trip: updatedTrip
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.put("/trips/:id/cancel", protect, authorize("manage_trips"), async (req, res) => {
    try {
        const existingTrip = await Trip.findById(req.params.id).populate("vehicle", "manager");
        if (!existingTrip) return res.status(404).json({ message: "Trip not found" });
        if (req.user.role !== "Admin" && String(existingTrip.vehicle?.manager || "") !== req.user.id) return res.status(403).json({ message: "You cannot update this trip." });
        existingTrip.status = "Cancelled"; await existingTrip.save();
        const trip = existingTrip;
        if (!trip) {
            return res.status(404).json({
                message: "Trip not found"
            });
        }
        res.status(200).json({
            message: "Trip cancelled successfully",
            trip
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/trips/:id", protect, authorize("manage_trips"), async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
            .populate("vehicle", "vehicleNumber model manager")
            .populate("driver", "name phone licenseNumber");
        if (!trip) return res.status(404).json({ message: "Trip not found" });
        if (req.user.role !== "Admin" && String(trip.vehicle?.manager || "") !== req.user.id) return res.status(403).json({ message: "You cannot view this trip." });
        res.status(200).json({ trip });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post("/advances", protect, authorize("manage_finances"), async (req, res) => {
    try {
        const newAdvance = new Advance(req.body);

        const savedAdvance = await newAdvance.save();

        res.status(201).json({
            message: "Advance recorded successfully",
            advance: savedAdvance
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/advances", protect, authorize("manage_finances"), async (req, res) => {
    try {
        const advances = await Advance.find()
            .populate("driver", "name phone")
            .populate("vehicle", "vehicleNumber model")
            .populate("trip", "startLocation endLocation");
        res.status(200).json({
            count: advances.length,
            advances
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post("/fuel-entries", protect, authorize("manage_finances"), async (req, res) => {
    try {
        const newFuelEntry = new FuelEntry(req.body);
        const savedFuelEntry = await newFuelEntry.save();
        res.status(201).json({
            message: "Fuel entry recorded successfully",
            fuelEntry: savedFuelEntry
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/fuel-entries", protect, authorize("manage_finances"), async (req, res) => {
    try {
        const fuelEntries = await FuelEntry.find()
            .populate("vehicle", "vehicleNumber model")
            .populate("driver", "name phone")
            .populate("trip", "startLocation endLocation");

        res.status(200).json({
            count: fuelEntries.length,
            fuelEntries
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/vehicles/:vehicleId/fuel-entries", protect, authorize("manage_finances"), async (req, res) => {
    try {
        const fuelEntries = await FuelEntry.find({
            vehicle: req.params.vehicleId
        })
            .populate("vehicle", "vehicleNumber model")
            .populate("driver", "name phone")
            .sort({ date: -1 });
        res.status(200).json({
            count: fuelEntries.length,
            fuelEntries
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/drivers/:driverId/advances", protect, authorize("manage_finances"), async (req, res) => {
    try {
        const advances = await Advance.find({
            driver: req.params.driverId
        })
            .populate("driver", "name phone")
            .populate("vehicle", "vehicleNumber model")
            .populate("trip", "startLocation endLocation")
            .sort({ date: -1 });

        res.status(200).json({
            count: advances.length,
            advances
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/drivers/:driverId/advance-summary", protect, authorize("manage_finances"), async (req, res) => {
    try {
        const summary = await Advance.aggregate([
            {
                $match: {
                    driver: new (require("mongoose").Types.ObjectId)(
                        req.params.driverId
                    )
                }
            },
            {
                $group: {
                    _id: "$driver",
                    totalAdvance: { $sum: "$amount" },
                    numberOfAdvances: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            summary: summary[0] || {
                totalAdvance: 0,
                numberOfAdvances: 0
            }
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.get("/vehicles/:vehicleId/fuel-summary", protect, authorize("manage_finances"), async (req, res) => {
    try {
        const summary = await FuelEntry.aggregate([
            {
                $match: {
                    vehicle: new (require("mongoose").Types.ObjectId)(
                        req.params.vehicleId
                    )
                }
            },
            {
                $group: {
                    _id: "$vehicle",
                    totalFuel: { $sum: "$quantity" },
                    totalExpense: { $sum: "$totalAmount" },
                    numberOfRefills: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            summary: summary[0] || {
                totalFuel: 0,
                totalExpense: 0,
                numberOfRefills: 0
            }
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post("/login", async (req, res) => {
    try {
        const { email, password, deviceName } = req.body;
        const user = await User.findOne({
            email: email.toLowerCase()
        });
        if (!user || user.isActive === false) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }
        const isMatch = await bcrypt.compare(
            password,
            user.password
        );
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken();
        const expiresAt = new Date(
            Date.now() + 90 * 24 * 60 * 60 * 1000
        );
        await RefreshToken.create({
            user: user._id,
            tokenHash: hashToken(refreshToken),
            expiresAt,
            deviceName: deviceName || "Unknown device"
        });
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 90 * 24 * 60 * 60 * 1000,
            path: "/"
        });
        res.status(200).json({
            message: "Login successful",
            accessToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post("/refresh", async (req, res) => {
    try {
        const oldToken = req.cookies.refreshToken;

        if (!oldToken) {
            return res.status(401).json({
                message: "Refresh token missing. Please login again."
            });
        }
        const oldTokenHash = hashToken(oldToken);
        const session = await RefreshToken.findOne({
            tokenHash: oldTokenHash,
            revokedAt: null,
            expiresAt: { $gt: new Date() }
        });
        if (!session) {
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/"
            });
            return res.status(401).json({
                message: "Session expired. Please login again."
            });
        }
        const user = await User.findById(session.user);
        if (!user || user.isActive === false) {
            return res.status(401).json({
                message: "User account is inactive or no longer exists."
            });
        }
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken();

        const expiresAt = new Date(
            Date.now() + 90 * 24 * 60 * 60 * 1000
        );
        session.revokedAt = new Date();
        session.replacedBy = hashToken(newRefreshToken);
        await session.save();
        await RefreshToken.create({
            user: user._id,
            tokenHash: hashToken(newRefreshToken),
            expiresAt,
            deviceName: session.deviceName
        });
        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 90 * 24 * 60 * 60 * 1000,
            path: "/"
        });
        res.status(200).json({
            message: "Token refreshed successfully",
            accessToken: newAccessToken
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post("/logout", async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            await RefreshToken.findOneAndUpdate(
                {
                    tokenHash: hashToken(refreshToken),
                    revokedAt: null
                },
                {
                    revokedAt: new Date()
                }
            );
        }
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/"
        });
        res.status(200).json({
            message: "Logged out successfully"
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.post(
    "/admin/create-manager",
    protect,
    authorize("manage_users"),
    async (req, res) => {
        try {
            const { name, email, phone, password } = req.body;
            if (!name || !email || !phone || !password) {
                return res.status(400).json({
                    message: "Name, email, phone and password are required"
                });
            }
            const existingUser = await User.findOne({
                email: email.toLowerCase()
            });
            if (existingUser) {
                return res.status(400).json({
                    message: "Email already registered"
                });
            }
            const newManager = new User({
                name,
                email,
                phone,
                password,
                role: "Manager",
                isActive: true
            });
            const savedManager = await newManager.save();
            res.status(201).json({
                message: "Manager account created successfully",
                user: {
                    id: savedManager._id,
                    name: savedManager.name,
                    email: savedManager.email,
                    role: savedManager.role
                }
            });

        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }
);
app.post(
    "/documents",
    protect,
    authorize("manage_documents"),
    upload.single("document"),
    async (req, res) => {
        try {
            console.log("DOCUMENT UPLOAD ROUTE REACHED");
            console.log("Uploaded file details:", req.file);
            const {
                documentName,
                documentType,
                vehicle,
                driver,
                documentNumber,
                issueDate,
                expiryDate
            } = req.body;
            console.log("Uploaded file details:", req.file);
            if (!documentName || !documentType || !req.file) {
                return res.status(400).json({
                    message: "Document name, type and file are required"
                });
            }
            if ((!vehicle && !driver) || (vehicle && driver)) {
                return res.status(400).json({
                    message: "Provide either a vehicle ID or a driver ID"
                });
            }
            const newDocument = new Document({
                documentName,
                documentType,
                vehicle: vehicle || null,
                driver: driver || null,
                documentNumber,
                issueDate: issueDate || null,
                expiryDate: expiryDate || null,
                fileUrl: req.file.path,
                publicId: req.file.filename,
                resourceType: "image",
                format: req.file.originalname.split(".").pop().toLowerCase(),
                uploadedBy: req.user.id
            });
            const savedDocument = await newDocument.save();
            res.status(201).json({
                message: "Document uploaded successfully",
                document: savedDocument
            });
        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }
);
app.get(
    "/documents",
    protect,
    authorize("manage_documents"),
    async (req, res) => {
        try {
            const documents = await Document.find()
                .populate("vehicle", "vehicleNumber model")
                .populate("driver", "name phone")
                .populate("uploadedBy", "name email")
                .sort({ createdAt: -1 });

            res.status(200).json({
                count: documents.length,
                documents
            });
        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }
);
app.get(
    "/documents/expiry-status",
    protect,
    authorize("manage_documents"),
    async (req, res) => {
        try {
            const today = new Date();
            const next30Days = new Date();
            next30Days.setDate(today.getDate() + 30);
            const documents = await Document.find({
                expiryDate: { $ne: null }
            })
                .populate("vehicle", "vehicleNumber")
                .populate("driver", "name phone")
                .sort({ expiryDate: 1 });

            const expired = documents.filter(
                doc => new Date(doc.expiryDate) < today
            );
            const expiringSoon = documents.filter(
                doc =>
                    new Date(doc.expiryDate) >= today &&
                    new Date(doc.expiryDate) <= next30Days
            );
            res.status(200).json({
                expiredCount: expired.length,
                expiringSoonCount: expiringSoon.length,
                expired,
                expiringSoon
            });
        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }
);
app.get(
    "/vehicles/:vehicleId/documents",
    protect,
    authorize("manage_documents"),
    async (req, res) => {
        try {
            const documents = await Document.find({
                vehicle: req.params.vehicleId
            }).sort({ createdAt: -1 });

            res.status(200).json({
                count: documents.length,
                documents
            });
        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }
);
app.get(
    "/drivers/:driverId/documents",
    protect,
    authorize("manage_documents"),
    async (req, res) => {
        try {
            const documents = await Document.find({
                driver: req.params.driverId
            }).sort({ createdAt: -1 });

            res.status(200).json({
                count: documents.length,
                documents
            });
        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }
);

app.delete(
    "/documents/:id",
    protect,
    authorize("manage_documents"),
    async (req, res) => {
        try {
            const document = await Document.findById(req.params.id);
            if (!document) {
                return res.status(404).json({
                    message: "Document not found"
                });
            }
            const cloudinaryResult = await cloudinary.uploader.destroy(
                document.publicId,
                {
                    resource_type: document.resourceType || "image"
                }
            );
            if (
                cloudinaryResult.result !== "ok" &&
                cloudinaryResult.result !== "not found"
            ) {
                return res.status(500).json({
                    message: "Failed to delete file from Cloudinary"
                });
            }
            await Document.findByIdAndDelete(req.params.id);
            res.status(200).json({
                message: "Document and uploaded file deleted successfully"
            });
        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }
);
app.get(
    "/documents/:id",
    protect,
    authorize("manage_documents"),
    async (req, res) => {
        try {
            const document = await Document.findById(req.params.id)
                .populate("vehicle", "vehicleNumber model")
                .populate("driver", "name phone licenseNumber")
                .populate("uploadedBy", "name email");
            if (!document) {
                return res.status(404).json({
                    message: "Document not found"
                });
            }
            res.status(200).json({ document });
        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }
);
app.get(
    "/documents/:id/access",
    protect,
    authorize("manage_documents"),
    async (req, res) => {
        try {
            const document = await Document.findById(req.params.id);
            if (!document) {
                return res.status(404).json({
                    message: "Document not found"
                });
            }
            if (!document.publicId || !document.format) {
                return res.status(400).json({
                    message: "Document file information is incomplete"
                });
            }
            const expiresAt = Math.floor(Date.now() / 1000) + 300;
            const accessUrl = cloudinary.utils.private_download_url(
                document.publicId,
                document.format,
                {
                    resource_type: document.resourceType,
                    type: "authenticated",
                    expires_at: expiresAt,
                    attachment: true
                }
            );
            res.status(200).json({
                message: "Temporary document access generated",
                accessUrl,
                expiresAt
            });
        } catch (error) {
            res.status(500).json({
                message: error.message
            });
        }
    }
);
app.get(
    "/export/vehicles",
    protect,
    authorize("view_reports"),
    async (req, res) => {
        try {
            const vehicles = await Vehicle.find()
                .populate("currentDriver", "name phone")
                .lean();

            const columns = [
                { header: "Vehicle Number", key: "vehicleNumber" },
                { header: "Vehicle Type", key: "vehicleType" },
                { header: "Model", key: "model" },
                { header: "Current Driver", key: "driverName" },
                { header: "Driver Phone", key: "driverPhone" },
                { header: "Status", key: "status" }
            ];
            const rows = vehicles.map(vehicle => ({
                vehicleNumber: vehicle.vehicleNumber,
                vehicleType: vehicle.vehicleType,
                model: vehicle.model,
                driverName: vehicle.currentDriver?.name || "Unassigned",
                driverPhone: vehicle.currentDriver?.phone || "",
                status: vehicle.status
            }));
            await exportToExcel(
                res,
                "Vehicles",
                columns,
                rows,
                "vehicles"
            );
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);
app.get(
    "/export/drivers",
    protect,
    authorize("view_reports"),
    async (req, res) => {
        try {
            const drivers = await Driver.find().lean();
            const columns = [
                { header: "Driver Name", key: "name" },
                { header: "Phone", key: "phone" },
                { header: "License Number", key: "licenseNumber" },
                { header: "Address", key: "address" },
                { header: "Status", key: "status" }
            ];
            const rows = drivers.map(driver => ({
                name: driver.name,
                phone: driver.phone,
                licenseNumber: driver.licenseNumber,
                address: driver.address || "",
                status: driver.status
            }));
            await exportToExcel(
                res,
                "Drivers",
                columns,
                rows,
                "drivers"
            );
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);
app.get(
    "/export/trips",
    protect,
    authorize("view_reports"),
    async (req, res) => {
        try {
            const trips = await Trip.find()
                .populate("vehicle", "vehicleNumber")
                .populate("driver", "name")
                .lean();
            const columns = [
                { header: "Vehicle Number", key: "vehicleNumber" },
                { header: "Driver Name", key: "driverName" },
                { header: "From", key: "startLocation" },
                { header: "To", key: "endLocation" },
                { header: "Start Date", key: "startDate" },
                { header: "End Date", key: "endDate" },
                { header: "Status", key: "status" }
            ];
            const rows = trips.map(trip => ({
                vehicleNumber: trip.vehicle?.vehicleNumber || "",
                driverName: trip.driver?.name || "",
                startLocation: trip.startLocation,
                endLocation: trip.endLocation,
                startDate: trip.startDate,
                endDate: trip.endDate || "",
                status: trip.status
            }));
            await exportToExcel(
                res,
                "Trips",
                columns,
                rows,
                "trips"
            );
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);
app.get(
    "/export/advances",
    protect,
    authorize("view_reports"),
    async (req, res) => {
        try {
            const advances = await Advance.find()
                .populate("driver", "name phone")
                .populate("vehicle", "vehicleNumber")
                .populate("trip", "startLocation endLocation")
                .lean();
            const columns = [
                { header: "Driver Name", key: "driverName" },
                { header: "Phone", key: "phone" },
                { header: "Amount", key: "amount" },
                { header: "Date", key: "date" },
                { header: "Purpose", key: "purpose" },
                { header: "Vehicle Number", key: "vehicleNumber" },
                { header: "Trip", key: "trip" }
            ];
            const rows = advances.map(advance => ({
                driverName: advance.driver?.name || "",
                phone: advance.driver?.phone || "",
                amount: advance.amount,
                date: advance.date,
                purpose: advance.purpose || "",
                vehicleNumber: advance.vehicle?.vehicleNumber || "",
                trip: advance.trip
                    ? `${advance.trip.startLocation} to ${advance.trip.endLocation}`
                    : ""
            }));
            await exportToExcel(
                res,
                "Advances",
                columns,
                rows,
                "advances"
            );
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);
app.get(
    "/export/fuel-entries",
    protect,
    authorize("view_reports"),
    async (req, res) => {
        try {
            const fuelEntries = await FuelEntry.find()
                .populate("vehicle", "vehicleNumber")
                .populate("driver", "name")
                .populate("trip", "startLocation endLocation")
                .lean();
            const columns = [
                { header: "Vehicle Number", key: "vehicleNumber" },
                { header: "Driver Name", key: "driverName" },
                { header: "Quantity (Litres)", key: "quantity" },
                { header: "Price Per Litre", key: "pricePerLitre" },
                { header: "Total Amount", key: "totalAmount" },
                { header: "Date", key: "date" },
                { header: "Fuel Station", key: "fuelStation" },
                { header: "Trip", key: "trip" }
            ];
            const rows = fuelEntries.map(entry => ({
                vehicleNumber: entry.vehicle?.vehicleNumber || "",
                driverName: entry.driver?.name || "",
                quantity: entry.quantity,
                pricePerLitre: entry.pricePerLitre,
                totalAmount: entry.totalAmount,
                date: entry.date,
                fuelStation: entry.fuelStation || "",
                trip: entry.trip
                    ? `${entry.trip.startLocation} to ${entry.trip.endLocation}`
                    : ""
            }));
            await exportToExcel(
                res,
                "Fuel Entries",
                columns,
                rows,
                "fuel-entries"
            );
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);
app.get(
    "/export/financial-summary",
    protect,
    authorize("view_reports"),
    async (req, res) => {
        try {
            const advances = await Advance.find()
            .populate("driver", "name")
            .lean();
            const fuelEntries = await FuelEntry.find()
                .populate("vehicle", "vehicleNumber")
                .populate("driver", "name")
                .lean();

            const totalAdvances = advances.reduce(
                (sum, item) => sum + item.amount, 0
            );

            const totalFuelExpense = fuelEntries.reduce(
                (sum, item) => sum + item.totalAmount, 0
            );
            const totalFuelQuantity = fuelEntries.reduce(
                (sum, item) => sum + item.quantity, 0
            );
            const sheets = [
                {
                    name: "Overall Summary",
                    columns: [
                        { header: "Metric", key: "metric" },
                        { header: "Value", key: "value" }
                    ],
                    rows: [
                        { metric: "Total Advances", value: totalAdvances },
                        { metric: "Total Diesel Expense", value: totalFuelExpense },
                        { metric: "Total Fuel (Litres)", value: totalFuelQuantity },
                        { metric: "Number of Advances", value: advances.length },
                        { metric: "Number of Fuel Entries", value: fuelEntries.length }
                    ]
                },
                {
                    name: "Vehicle Fuel Expenses",
                    columns: [
                        { header: "Vehicle Number", key: "vehicleNumber" },
                        { header: "Fuel Quantity (Litres)", key: "quantity" },
                        { header: "Total Expense", key: "totalExpense" }
                    ],
                    rows: Object.values(
                        fuelEntries.reduce((result, entry) => {
                            const vehicleNumber =
                                entry.vehicle?.vehicleNumber || "Unknown";

                            if (!result[vehicleNumber]) {
                                result[vehicleNumber] = {
                                    vehicleNumber,
                                    quantity: 0,
                                    totalExpense: 0
                                };
                            }
                            result[vehicleNumber].quantity += entry.quantity;
                            result[vehicleNumber].totalExpense += entry.totalAmount;

                            return result;
                        }, {})
                    )
                },
                {
                    name: "Driver Advances",
                    columns: [
                        { header: "Driver Name", key: "driverName" },
                        { header: "Total Advances", key: "totalAdvances" }
                    ],
                    rows: Object.values(
                        advances.reduce((result, advance) => {
                            const driverName = advance.driver?.name || "Unknown";
                            if (!result[driverName]) {
                                result[driverName] = {
                                    driverName,
                                    totalAdvances: 0
                                };
                            }
                            result[driverName].totalAdvances += advance.amount;
                            return result;
                        }, {})
                    )
                }
            ];
            await exportMultipleSheets(
                res,
                sheets,
                "financial-summary"
            );
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
);
const startServer = async()=>{
    await dataBase();
    app.listen(PORT,()=>{
        console.log(`My Project Backend running on ${PORT}`);
    });
};
startServer();