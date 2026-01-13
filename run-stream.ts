/**
 * Minimal reproducible example: Database.runStream async iterator truncates results
 *
 * When consuming results from `Database.runStream()` using an async iterator, the results
 * are truncated. This differs from `Snapshot.runStream()` which returns all results correctly.
 *
 * The issue is that `Database.runStream()` wraps the `Snapshot.runStream()` result and
 * introduces a bug that causes the stream to end prematurely when using async iteration.
 */

import { Database, Snapshot, Spanner } from "@google-cloud/spanner";

const INSTANCE_ID = process.env.SPANNER_INSTANCE!;
const DATABASE_ID = process.env.SPANNER_DATABASE!;

async function runAndCountRows(
  dbOrSnaphost: Database | Snapshot
): Promise<number> {
  const stream = dbOrSnaphost.runStream({
    sql: "SELECT x FROM UNNEST(GENERATE_ARRAY(0, 99)) AS x",
    json: true,
  });

  let count = 0;
  for await (const row of stream) {
    if (row === undefined) {
      continue;
    }

    count++;
  }

  return count;
}

async function main() {
  const spanner = new Spanner();
  const instance = spanner.instance(INSTANCE_ID);
  const database = instance.database(DATABASE_ID);

  let snapshot: Snapshot | undefined;
  try {
    console.log("Query: SELECT x FROM UNNEST(GENERATE_ARRAY(0, 99)) AS x");
    console.log("Expected row count: 100\n");

    const databaseCount = await runAndCountRows(database);
    console.log(`Database.runStream() row count: ${databaseCount}`);

    [snapshot] = await database.getSnapshot();
    const snapshotCount = await runAndCountRows(snapshot);
    console.log(`Snapshot.runStream() row count: ${snapshotCount}`);
  } finally {
    snapshot?.end();
    await database.close();
    spanner.close();
  }
}

main();
