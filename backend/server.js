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
const protect = require("./middleware/auth");
const authorize = require("./middleware/authorize");
const app = express();
const PORT = 3333;
const RefreshToken = require("./models/RefreshToken");
const {
    generateAccessToken,
    generateRefreshToken,
    hashToken
} = require("./utils/tokenUtils");
app.use(express.json());
app.use(cookieParser());
app.get("/vehicles", protect, authorize("manage_vehicles"), async (req, res) => {
    try {
        const vehicles = await Vehicle.find()
            .populate("currentDriver", "name phone");
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
app.delete("/vehicles/:id", async (req, res) => {
    try {
        const deletedVehicle = await Vehicle.findByIdAndDelete(
            req.params.id
        );
        if (!deletedVehicle) {
            return res.status(404).json({
                message: "Vehicle not found"
            });
        }
        res.status(200).json({
            message: "Vehicle deleted successfully",
            vehicle: deletedVehicle
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.put("/vehicles/:id", protect, authorize("manage_vehicles"), async (req, res) => {
    try {
        const updatedVehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,
                runValidators: true
            }
        );
        if (!updatedVehicle) {
            return res.status(404).json({
                message: "Vehicle not found"
            });
        }
        res.status(200).json({
            message: "Vehicle updated successfully!",
            vehicle: updatedVehicle
        });
    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});
app.delete("/vehicles/:id", protect, authorize("manage_vehicles"), async (req, res) => {
    res.send("Updating Vehicle" + req.params.id);
});
app.post("/drivers", protect, authorize("manage_drivers"), async (req, res) => {
    try{
    const newDriver = new Driver(req.body);
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
app.post("/vehicles", protect, authorize("manage_vehicles"), async (req, res) => {
    try {
        const newVehicle = new Vehicle(req.body);
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
app.post("/vehicles/:vehicleId/assign-driver", async (req, res) => {
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
            driver: driverId
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
app.get("/vehicles/:vehicleId/assignments", async (req, res) => {
    try {
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
        const newTrip = new Trip(req.body);
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
        const trips = await Trip.find()
            .populate("vehicle", "vehicleNumber model")
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
app.put("/trips/:id/complete", async (req, res) => {
    try {
        const updatedTrip = await Trip.findByIdAndUpdate(
            req.params.id,
            {
                status: "Completed",
                endDate: new Date()
            },
            {
                new: true,
                runValidators: true
            }
        );
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
app.put("/trips/:id/cancel", async (req, res) => {
    try {
        const trip = await Trip.findByIdAndUpdate(
            req.params.id,
            {
                status: "Cancelled"
            },
            {
                new: true,
                runValidators: true
            }
        );
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
app.get("/trips/:id", async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
            .populate("vehicle", "vehicleNumber model")
            .populate("driver", "name phone licenseNumber");
        if (!trip) {
            return res.status(404).json({
                message: "Trip not found"
            });
        }
        res.status(200).json({
            trip
        });
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
app.get("/vehicles/:vehicleId/fuel-entries", async (req, res) => {
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
app.get("/drivers/:driverId/advances", async (req, res) => {
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
app.get("/drivers/:driverId/advance-summary", async (req, res) => {
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
app.get("/vehicles/:vehicleId/fuel-summary", async (req, res) => {
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
        if (!user) {
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
                role: user.role
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
        if (!user) {
            return res.status(401).json({
                message: "User not found."
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
            const { name, email, password } = req.body;
            if (!name || !email || !password) {
                return res.status(400).json({
                    message: "Name, email and password are required"
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
                password,
                role: "Manager"
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
const startServer = async()=>{
    await dataBase();
    app.listen(PORT,()=>{
        console.log(`My Project Backend running on ${PORT}`);
    });
};
startServer();