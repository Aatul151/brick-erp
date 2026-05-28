import { sql } from "drizzle-orm";
import { db } from "../../../models/db.js";

const PARTITION_NAME_RE = /^records_\d{4}_H[12]$/;

function halfYearBounds(year, half) {
    const y = String(year);
    if (half === 1) {
        return {
            from: `${y}-01-01`,
            to: `${y}-07-01`,
        };
    }
    return {
        from: `${y}-07-01`,
        to: `${year + 1}-01-01`,
    };
}

export const ensureRecordPartitions = async (startYear) => {
    try {
        const spanYears = 2;
        const baseYear = startYear ?? new Date().getUTCFullYear();
        const years = Array.from({ length: spanYears }, (_, i) => baseYear + i);

        for (const year of years) {
            for (const half of ([1, 2])) {
                const name = `records_${year}_H${half}`;
                if (!PARTITION_NAME_RE.test(name)) {
                    throw new Error(`Invalid partition name: ${name}`);
                }

                const check = await db.execute(
                    sql`SELECT EXISTS (
                    SELECT 1
                    FROM pg_catalog.pg_class c
                    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public'
                      AND c.relname = ${name}
                      AND c.relkind IN ('r', 'p')
                ) AS "exists"`,
                );

                const row = check.rows[0];
                if (row?.exists === true) {
                    continue;
                }

                const { from, to } = halfYearBounds(year, half);
                await db.execute(
                    sql.raw(
                        `CREATE TABLE IF NOT EXISTS public."${name}" PARTITION OF public.records FOR VALUES FROM ('${from}') TO ('${to}')`,
                    ),
                );
                console.log(`DB | Created partition: ${name}`);
            }
        }

        console.log("DB | Partition tables sync")
    } catch (err) {
        console.error("DB | ERROR in Creation of Partition table of Record Table")
    }
}
