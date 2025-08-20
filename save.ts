import express , {Response} from "express";
import pool from "./config/db";



interface Request {  body: {
    provider: string;   
    provider_id: string;
    name: string;     
    email: string;
    profile_pic: string;
  };
}


const app = express();
app.use(express.json());

app.post("/api/save-user", async (req:Request, res:Response) => {
  const { provider, provider_id, name, email, profile_pic } = req.body;

  try {
    await pool.query(
      `INSERT INTO users (provider, provider_id, name, email, profile_pic)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (provider, provider_id)
       DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         profile_pic = EXCLUDED.profile_pic`,
      [provider, provider_id, name, email, profile_pic]
    );

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Database error" });
  }
}); 


app.listen(8001, () => console.log("Server running on port 8001"));
