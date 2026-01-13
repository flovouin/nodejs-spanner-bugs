/**
 * Minimal reproducible example: UUID string in struct parameter type inference bug
 *
 * When passing a struct parameter to `run()` containing a string field with a UUID-formatted
 * value, the Spanner client incorrectly infers the field type as UUID instead of STRING.
 * The inferred UUID type is not explicitly passed to the Spanner API, causing the backend
 * to return an error because it cannot determine the parameter type.
 */

import { Spanner } from "@google-cloud/spanner";

const INSTANCE_ID = process.env.SPANNER_INSTANCE!;
const DATABASE_ID = process.env.SPANNER_DATABASE!;

async function main() {
  const spanner = new Spanner();
  const instance = spanner.instance(INSTANCE_ID);
  const database = instance.database(DATABASE_ID);

  // A string that happens to match UUID format.
  const uuidLikeString = "550e8400-e29b-41d4-a716-446655440000";

  try {
    // This query fails because:
    // 1. The client detects the string matches UUID format and infers it as UUID type
    // 2. However, UUID type information is not passed to the Spanner API
    // 3. Spanner cannot determine the struct field type and returns an error
    const [rows] = await database.run({
      sql: "SELECT @value.v AS v",
      params: { value: Spanner.struct({ v: uuidLikeString }) },
      json: true,
      // Workaround: Explicitly specify the struct field type
      // types: {
      //   value: { type: "struct", fields: [{ name: "v", type: "string" }] },
      // },
    });

    console.log("Query succeeded (unexpected):");
    console.log(rows);
  } catch (error: any) {
    console.error("Query failed with error:");
    console.error(error.details);
  } finally {
    await database.close();
    spanner.close();
  }
}

main();
