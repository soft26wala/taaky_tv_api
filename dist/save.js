"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("./config/db"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.post("/api/save-user", async (req, res) => {
    const { provider, provider_id, name, email, profile_pic } = req.body;
    try {
        await db_1.default.query(`INSERT INTO users (provider, provider_id, name, email, profile_pic)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (provider, provider_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         profile_pic = EXCLUDED.profile_pic`, [provider, provider_id, name, email, profile_pic]);
        res.json({ success: true });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Database error" });
    }
});
app.listen(8001, () => console.log("Server running on port 8001"));
