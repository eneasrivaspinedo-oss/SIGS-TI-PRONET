import { pool } from "@workspace/db";
import { seedDatabase } from "./lib/seed";

try {
  await seedDatabase();
} finally {
  await pool.end();
}
