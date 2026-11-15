require("dotenv").config();
const mongoose = require("mongoose");
const readline = require("readline");
const User = require("./models/User");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
async function resetAdminPassword() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const admin = await User.findOne({
            email: "admin@example.com",
            role: "Admin"
        });
        if (!admin) {
            console.log("Admin account not found.");
            return;
        }
        rl.question("Enter your new Admin password: ", async (password) => {
            if (!password || password.length < 6) {
                console.log("Password must be at least 6 characters.");
                rl.close();
                await mongoose.disconnect();
                return;
            }
            admin.password = password;
            await admin.save();
            console.log("Admin password reset successfully!");
            rl.close();
            await mongoose.disconnect();
        });
    } catch (error) {
        console.error("Error:", error.message);
        rl.close();
        await mongoose.disconnect();
    }
}
resetAdminPassword();
