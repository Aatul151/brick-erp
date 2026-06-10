import { parseEntryDate, tenantWhere } from "../../apps/records/utils/utilities.js";
import { db } from "../../models/db.js";
import { eq, desc, sql, gte, lte, and } from "drizzle-orm";
import { labours, records } from "../../models/schemaIndex.js";

export const getCountStatistics = async (req, res) => {
    try {
        const whereClause = buildFilterConditions(req);

        const expenseByAccount = await getExpenseByAccount(whereClause);
        const statistics = await getExpenseStatistics(whereClause);
        const growth = await getMonthGrowth(whereClause, statistics.startOfMonth);

        delete statistics.startOfMonth;
        return res.status(200).json({
            success: true,
            message: "Dashboard Statistics",
            expense: {
                account: expenseByAccount,
                statistics: {
                    ...statistics,
                    growth,
                },
            }

        });

    } catch (error) {
        console.error("Get count statistics error:", error);
        res.status(500).json({ error: "Failed to fetch dashbord count statistics" });
    }
};

export const getChartStatistics = async (req, res) => {
    try {
        const whereClause = buildFilterConditions(req);
        const chart = req.query?.chartType || null;
        const result = { success: true };

        if (!chart || chart === "category") {
            result.category = await getCategoryWiseData(whereClause);
        }

        if (!chart || chart === "labour") {
            result.labour = await getLabourWiseData(whereClause);
        }

        if (!chart || chart === "labourType") {
            result.labourType = await getLabourTypeWiseData(whereClause);
        }

        return res.status(200).json(result);
    } catch (error) {
        console.error("Get Chart statistics error:", error);
        res.status(500).json({ error: "Failed to fetch dashbord Chart statistics" });
    }
}

const buildFilterConditions = (req) => {
    const {
        recordType = "Expense",
        accountName,
        categoryName,
        entryDate,
        labourId
    } = req.query;

    const conditions = [tenantWhere(records.tenantId, req)];

    if (recordType) {
        conditions.push(eq(records.recordType, recordType));
    }

    if (accountName) {
        conditions.push(eq(records.accountName, accountName?.trim()));
    }

    if (categoryName) {
        conditions.push(eq(records.categoryName, categoryName?.trim()));
    }

    if (entryDate) {
        conditions.push(eq(records.entryDate, parseEntryDate(entryDate)));
    }

    if (labourId) {
        conditions.push(eq(records.labourId, labourId));
    }

    return and(...conditions);
};


//#region Count Statistics
const getExpenseByAccount = async (whereClause) => {
    const data = await db.select({
        accountName: records.accountName,
        amount: sql`COALESCE(SUM(${records.value}), 0)::numeric`,
    })
        .from(records)
        .where(whereClause)
        .groupBy(records.accountName)
        .orderBy(sql`SUM(${records.value}) DESC`);

    return data.map((item) => ({
        accountName: item?.accountName || "Unknown",
        amount: Number(item.amount || 0),
    }));
};

const getExpenseStatistics = async (whereClause) => {
    const now = new Date();

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [[{ today }], [{ week }], [{ month }], [{ year }]] =
        await Promise.all([
            db.select({ today: sql`COALESCE(SUM(${records.value}),0)::numeric` })
                .from(records).where(and(whereClause, gte(records.entryDate, startOfToday))),

            db.select({ week: sql`COALESCE(SUM(${records.value}),0)::numeric`, })
                .from(records).where(and(whereClause, gte(records.entryDate, startOfWeek))),

            db.select({ month: sql`COALESCE(SUM(${records.value}),0)::numeric` })
                .from(records).where(and(whereClause, gte(records.entryDate, startOfMonth))),

            db.select({ year: sql`COALESCE(SUM(${records.value}),0)::numeric` })
                .from(records).where(and(whereClause, gte(records.entryDate, startOfYear))),
        ]);

    return {
        today: Number(today || 0),
        week: Number(week || 0),
        month: Number(month || 0),
        year: Number(year || 0),
        startOfMonth,
    };
};

const getMonthGrowth = async (whereClause, startOfMonth) => {
    const now = new Date();
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [[{ currentMonth }], [{ lastMonth }]] = await Promise.all([
        db.select({ currentMonth: sql`COALESCE(SUM(${records.value}),0)::numeric` })
            .from(records).where(and(whereClause, gte(records.entryDate, startOfMonth))),

        db.select({ lastMonth: sql`COALESCE(SUM(${records.value}),0)::numeric` })
            .from(records).where(
                and(
                    whereClause,
                    gte(records.entryDate, startOfLastMonth),
                    sql`${records.entryDate} <= ${endOfLastMonth}`
                )
            ),
    ]);

    let percentage = 0;
    if (Number(lastMonth) > 0) {
        percentage = ((Number(currentMonth) - Number(lastMonth)) / Number(lastMonth)) * 100;
    }

    return {
        percentage: Number(percentage.toFixed(2)),
        isIncrease: Number(currentMonth) >= Number(lastMonth),
        currentMonth: Number(currentMonth || 0),
        lastMonth: Number(lastMonth || 0),
    };
};
//#endregion

//#region Chart data
const getRandomColor = () => `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`;
const getCategoryWiseData = async (whereClause) => {
    const data = await db
        .select({
            label: records.categoryName,
            category: records.category,
            value: sql`COALESCE(SUM(${records.value}),0)::numeric`,
        })
        .from(records)
        .where(whereClause)
        .groupBy(records.categoryName, records.category)
        .orderBy(sql`SUM(${records.value}) DESC`);

    return data.map((item) => ({
        label: item?.label || "Unknown",
        value: Number(item?.value || 0),
        color: item?.category?.color || getRandomColor(),
    }));
};

const getLabourWiseData = async (whereClause) => {
    const data = await db
        .select({
            label: labours.fullName,
            value: sql`COALESCE(SUM(${records.value}),0)::numeric`,
        })
        .from(records)
        .leftJoin(
            labours,
            eq(records.labourId, labours.id)
        )
        .where(whereClause)
        .groupBy(labours.id, labours.fullName)
        .orderBy(desc(sql`SUM(${records.value})`));

    return data.map((item) => ({
        label: item?.label || "Unknown",
        value: Number(item?.value || 0),
        color: getRandomColor(),
    }));
};

const getLabourTypeWiseData = async (whereClause) => {
    const data = await db
        .select({
            label: sql`COALESCE(${labours.labourType}, 'Unknown')`,
            value: sql`COALESCE(SUM(${records.value}),0)::numeric`,
        })
        .from(records)
        .leftJoin(
            labours,
            eq(records.labourId, labours.id)
        )
        .where(whereClause)
        .groupBy(sql`COALESCE(${labours.labourType}, 'Unknown')`)
        .orderBy(desc(sql`SUM(${records.value})`));

    return data?.map((item) => ({
        label: item?.label || "Unknown",
        value: Number(item?.value || 0),
        color: getRandomColor(),
    }));
};
//#endregion