const express = require("express");
const mongoose = require("mongoose");
const Vehicle = require("../models/Vehicle");
const Driver = require("../models/Driver");
const User = require("../models/User");
const VehicleManagerHistory = require("../models/VehicleManagerHistory");
const protect = require("../middleware/auth");
const router = express.Router();
const adminOnly = (req,res,next) => req.user.role === "Admin" ? next() : res.status(403).json({message:"Only Admin can review vehicle registrations or transfer vehicles."});
router.get("/approvals", protect, adminOnly, async (req,res) => {
  try { const vehicles = await Vehicle.find({registrationStatus:"Pending"}).populate("submittedBy","name email").sort({createdAt:1}); res.json({vehicles, count:vehicles.length}); }
  catch(e){res.status(500).json({message:"Unable to load approvals."});}
});
router.post("/vehicles/:id/approve", protect, adminOnly, async(req,res)=>{
 try {
  if(!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({message:"Invalid vehicle ID."});
  const vehicle=await Vehicle.findById(req.params.id); if(!vehicle) return res.status(404).json({message:"Vehicle not found."});
  if(vehicle.registrationStatus!=="Pending") return res.status(409).json({message:"This vehicle is not pending approval."});
  const managerId=req.body.managerId || vehicle.submittedBy;
  if(managerId){const manager=await User.findOne({_id:managerId,role:"Manager",isActive:true}); if(!manager)return res.status(400).json({message:"Select an active Manager."});}
  vehicle.manager=managerId || null; vehicle.registrationStatus="Approved"; vehicle.approvedBy=req.user.id; vehicle.approvedAt=new Date(); vehicle.rejectionReason=""; await vehicle.save();
  await VehicleManagerHistory.create({vehicle:vehicle._id,fromManager:null,toManager:vehicle.manager,changedBy:req.user.id,action:"Approved"});
  res.json({message:"Vehicle approved and assigned.",vehicle});
 } catch(e){res.status(500).json({message:"Unable to approve vehicle."});}
});
router.post("/vehicles/:id/reject", protect, adminOnly, async(req,res)=>{
 try { if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:"Invalid vehicle ID."}); const reason=String(req.body.reason||"").trim(); if(!reason)return res.status(400).json({message:"A rejection reason is required."}); const v=await Vehicle.findById(req.params.id); if(!v)return res.status(404).json({message:"Vehicle not found."}); if(v.registrationStatus!=="Pending")return res.status(409).json({message:"This vehicle is not pending approval."}); v.registrationStatus="Rejected";v.rejectionReason=reason;v.approvedBy=req.user.id;v.approvedAt=new Date();await v.save();await VehicleManagerHistory.create({vehicle:v._id,fromManager:null,toManager:null,changedBy:req.user.id,action:"Rejected",note:reason});res.json({message:"Vehicle registration rejected.",vehicle:v}); }
 catch(e){res.status(500).json({message:"Unable to reject vehicle."});}
});
router.post("/vehicles/:id/transfer", protect, adminOnly, async(req,res)=>{
 try { if(!mongoose.isValidObjectId(req.params.id)||!mongoose.isValidObjectId(req.body.managerId))return res.status(400).json({message:"Select a valid vehicle and Manager."}); const manager=await User.findOne({_id:req.body.managerId,role:"Manager",isActive:true});if(!manager)return res.status(400).json({message:"Select an active Manager."});const v=await Vehicle.findById(req.params.id);if(!v)return res.status(404).json({message:"Vehicle not found."});if(v.registrationStatus!=="Approved")return res.status(409).json({message:"Only approved vehicles can be transferred."});const previousManager=v.manager;v.manager=manager._id;await v.save();await VehicleManagerHistory.create({vehicle:v._id,fromManager:previousManager,toManager:manager._id,changedBy:req.user.id,action:"Transferred"});res.json({message:"Vehicle transferred.",vehicle:v,previousManager}); }
 catch(e){res.status(500).json({message:"Unable to transfer vehicle."});}
});
router.get("/vehicles/:id/history", protect, async(req,res)=>{
 try {if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({message:"Invalid vehicle ID."});const v=await Vehicle.findById(req.params.id).populate("manager","name").populate("currentDriver","name phone");if(!v)return res.status(404).json({message:"Vehicle not found."});if(req.user.role!=="Admin"&&String(v.manager||"")!==req.user.id)return res.status(403).json({message:"You cannot view this vehicle."});
 const Trip=require("../models/Trip"), FuelEntry=require("../models/FuelEntry"), Advance=require("../models/Advance"), Document=require("../models/Document"), DriverAssignment=require("../models/DriverAssignment");
 const [trips,fuelEntries,advances,documents,assignments,managerHistory]=await Promise.all([Trip.find({vehicle:v._id}).populate("driver","name phone").sort({startDate:-1}),FuelEntry.find({vehicle:v._id}).populate("driver","name").sort({date:-1}),Advance.find({vehicle:v._id}).populate("driver","name").sort({date:-1}),Document.find({vehicle:v._id}).sort({createdAt:-1}),DriverAssignment.find({vehicle:v._id}).populate("driver","name phone licenseNumber").sort({assignedDate:-1}),VehicleManagerHistory.find({vehicle:v._id}).populate("fromManager toManager changedBy","name").sort({createdAt:-1})]);
 res.json({vehicle:v,trips,fuelEntries,advances,documents,assignments,managerHistory});
 }catch(e){res.status(500).json({message:"Unable to load vehicle history."});}
});
module.exports=router;