import pkg from "pg";

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL2,
  // ssl: {
  //   rejectUnauthorized: false, // required for Neon
  // },
});

export async function testConnection() {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("Connected! Server time:", result.rows[0].now);
  } catch (err) {
    console.error("Connection error:", err);
  }
}
