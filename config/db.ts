import { Pool } from "pg";

const pool: Pool = new Pool({
  user: "postgres",
  host: "database-1.czi08gwqmkga.eu-north-1.rds.amazonaws.com",
  database: "database-1.czi08gwqmkga.eu-north-1.rds.amazonaws.com",
  password: "Anmol26ffthind",
  port: 5432,
});

export default pool; 