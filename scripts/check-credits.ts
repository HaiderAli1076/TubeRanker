import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool
  .query(`SELECT id, email, credits FROM "User" WHERE id = 'cmqcmdwn90000dcuotsvrulvc'`)
  .then((r) => {
    console.log("Your user:", r.rows[0]);
    pool.end();
  })
  .catch((e) => { console.error(e); pool.end(); });
