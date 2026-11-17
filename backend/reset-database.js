require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const bcrypt = require("bcryptjs");
const cloudinary = require("./config/cloudinary");

const User = require("./models/User");
const RefreshToken = require("./models/RefreshToken");
const Vehicle = require("./models/Vehicle");
const Driver = require("./models/Driver");
const DriverAssignment = require("./models/DriverAssignment");
const Trip = require("./models/Trip");
const Advance = require("./models/Advance");
const FuelEntry = require("./models/FuelEntry");
const Document = require("./models/Document");

const ADMIN = {
  name: "Yash",
  email: "hpyf2252@gmail.com",
  phone: "+91 7396321110",
  role: "Admin",
  phoneVerified: true
};

const models = [
  User,
  RefreshToken,
  Vehicle,
  Driver,
  DriverAssignment,
  Trip,
  Advance,
  FuelEntry,
  Document
];

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, answer => {
    rl.close();
    resolve(answer.trim());
  }));
}

function askHidden(question) {
  return new Promise(resolve => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(question);
    stdin.resume();
    stdin.setRawMode(true);
    let value = "";
    const onData = (char) => {
      char = char.toString();
      if (char === "\u0003") process.exit(1);
      if (char === "\r" || char === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        stdout.write("\n");
        resolve(value);
      } else if (char === "\u007f" || char === "\b") {
        value = value.slice(0, -1);
      } else if (char >= " ") {
        value += char;
      }
    };
    stdin.on("data", onData);
  });
}

async function backupAllCollections() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(__dirname, "backups", `before-reset-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });
  const collections = await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray();
  const manifest = [];

  for (const collectionInfo of collections) {
    const collection = mongoose.connection.db.collection(collectionInfo.name);
    const docs = await collection.find({}).toArray();
    const file = path.join(backupDir, `${collectionInfo.name}.json`);
    fs.writeFileSync(file, JSON.stringify(docs, null, 2));
    manifest.push({ collection: collectionInfo.name, count: docs.length, file: path.basename(file) });
  }

  fs.writeFileSync(path.join(backupDir, "manifest.json"), JSON.stringify({
    createdAt: new Date().toISOString(),
    database: mongoose.connection.name,
    collections: manifest
  }, null, 2));
  return { backupDir, manifest };
}

async function removeCloudinaryDocuments(documents) {
  let removed = 0;
  const failures = [];
  for (const doc of documents) {
    if (!doc.publicId) continue;
    let deleted = false;
    let lastError = null;
    for (const resourceType of ["image", "raw", "video"]) {
      try {
        const result = await cloudinary.uploader.destroy(doc.publicId, {
          resource_type: resourceType,
          type: "authenticated",
          invalidate: true
        });
        if (result.result === "ok" || result.result === "not found") {
          deleted = true;
          break;
        }
      } catch (error) {
        lastError = error;
      }
    }
    if (deleted) removed++;
    else failures.push({ publicId: doc.publicId, error: lastError?.message || "Could not confirm deletion" });
  }
  if (failures.length) {
    throw new Error(`Cloudinary cleanup incomplete for ${failures.length} document(s). Database was NOT reset. First issue: ${failures[0].error}`);
  }
  return removed;
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing. Check your backend .env file.");
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected to MongoDB database: ${mongoose.connection.name}`);
  console.log("\nTHIS WILL DELETE ALL USERS AND ALL FLEET TEST DATA IN THIS DATABASE.");
  console.log(`A new Admin will be created: ${ADMIN.email}`);
  console.log(`Registered mobile: ${ADMIN.phone}`);
  console.log("A JSON backup of every collection will be created first.\n");

  const confirmation = await ask('Type exactly "RESET MANAGMENT_IG" to continue: ');
  if (confirmation !== "RESET MANAGMENT_IG") {
    console.log("Confirmation did not match. Nothing was changed.");
    return;
  }

  const password = await askHidden("Enter a new Admin password (minimum 12 characters; input hidden): ");
  if (password.length < 12) throw new Error("Password must be at least 12 characters.");
  const passwordAgain = await askHidden("Re-enter the Admin password: ");
  if (password !== passwordAgain) throw new Error("Passwords do not match. Nothing was deleted.");

  console.log("\nCreating backup of all database collections...");
  const { backupDir, manifest } = await backupAllCollections();
  console.log(`Backup completed: ${backupDir}`);
  console.log(`Collections backed up: ${manifest.length}`);

  const documents = await Document.find({}).lean();
  console.log(`Cleaning up ${documents.length} referenced Cloudinary document(s)...`);
  const cloudinaryRemoved = await removeCloudinaryDocuments(documents);
  console.log(`Cloudinary cleanup completed: ${cloudinaryRemoved} document(s) processed.`);

  for (const Model of models) {
    const result = await Model.deleteMany({});
    console.log(`${Model.collection.collectionName}: deleted ${result.deletedCount}`);
  }

  const admin = new User({ ...ADMIN, password });
  await admin.save();
  console.log("\nRESET COMPLETED.");
  console.log(`New Admin created: ${admin.email}`);
  console.log(`Admin phone: ${admin.phone}`);
  console.log(`Admin ID: ${admin._id}`);
  console.log("Password was hashed by the User model; it was not written to the backup or printed.");
  console.log(`Backup location: ${backupDir}`);
}

main()
  .catch(error => {
    console.error("\nRESET STOPPED:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });