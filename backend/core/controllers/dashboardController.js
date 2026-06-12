import { parseEntryDate, tenantWhere } from "../../apps/records/utils/utilities.js";
import { db } from "../../models/db.js";
import { eq, desc, sql, gte, lte, and, ilike, or, inArray } from "drizzle-orm";
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

export const getActivities = async (req, res) => {
    try {
        const type = ["labour", "category"]?.includes(req.params.type) ? req.params.type : "labour";
        const searchText = req.query?.searchText || null;

        const filter = [];
        if (searchText && type == "labour") {
            filter.push(
                or(
                    ilike(labours.fullName, `%${searchText.trim()}%`),
                    ilike(labours.labourCode, `%${searchText.trim()}%`)
                )
            );
        }

        if (searchText && type == "category") {
            filter.push(ilike(records.categoryName, `%${searchText.trim()}%`));
        }

        const whereClause = buildFilterConditions(req, filter);
        const result = { success: true };
        result.details = await getGroupedWorkData(whereClause, type, req);

        return res.status(200).json(result);
    } catch (error) {
        console.error("Get activities error:", error);
        res.status(500).json({ error: "Failed to fetch dashbord activities list" });
    }
}

const buildFilterConditions = (req, extraFilters = []) => {
    const {
        recordType = "Expense",
        accountName,
        categoryName,
        entryDate,
        labourId,
        formDate,
        toDate,
        labelValue
    } = req.query;

    const conditions = [tenantWhere(records.tenantId, req)];

    if (recordType) {
        conditions.push(eq(records.recordType, recordType));
    }

    if (accountName) {
        conditions.push(eq(records.accountName, accountName?.trim()));
    }

    if (categoryName) {
        const categories = categoryName.split(",").map(v => v.trim()).filter(Boolean);
        conditions.push(inArray(records.categoryName, categories));
    }

    if (entryDate) {
        conditions.push(eq(records.entryDate, parseEntryDate(entryDate)));
    }

    if (labelValue) {
        const allLabel = labelValue?.split(",").map(v => v.trim().toLowerCase()).filter(Boolean);

        if (allLabel.length > 0) {
            conditions.push(
                sql`(${sql.join(
                    allLabel.map(v => sql`${records.label} @> ${JSON.stringify([{ value: v?.toLowerCase() }])}::jsonb`),
                    sql` OR `
                )})`
            );
        }
    }

    if (formDate) {
        conditions.push(gte(records.entryDate, parseEntryDate(formDate)));
    }
    if (toDate) {
        conditions.push(lte(records.entryDate, parseEntryDate(toDate)));
    }

    if (labourId) {
        conditions.push(eq(records.labourId, labourId));
    }

    conditions.push(...extraFilters);

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
    } else {
        percentage = 100
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

//#region List Statistic
const getGroupedWorkData = async (whereClause, parentField = "labour", req) => {
    const page = Number(req.query?.page || 1);
    const limit = Number(req.query?.limit || 5);

    const data = await db.select({
        labourId: labours.id,
        labour: labours.fullName,
        labourCode: labours.labourCode,
        categoryName: records.categoryName,
        category: records.category,
        value: sql`COALESCE(SUM(${records.value}),0)::numeric`,
    })
        .from(records)
        .leftJoin(labours, eq(records.labourId, labours.id))
        .where(whereClause)
        .groupBy(labours.id, labours.fullName, labours.labourCode, records.category, records.categoryName);

    const grouped = Object.values(data.reduce((acc, item) => {
        const key = parentField === "category" ? item.categoryName || "Unknown" : item.labourId;

        if (!acc[key]) {
            acc[key] = parentField === "category" ?
                {
                    id: item?.category?.id,
                    categoryName: item.categoryName || "Unknown",
                    color: item.category?.color,
                    icon: item.category?.icon,
                    labour: [],
                }
                : {
                    id: item.labourId,
                    name: item.labour || "Unknown",
                    labourCode: item.labourCode,
                    category: [],
                };
        }

        if (parentField == "category") {
            acc[key].labour.push({
                id: item.labourId,
                name: item.labour || "Unknown",
                code: item.labourCode,
                value: Number(item.value || 0),
            });
        } else {
            acc[key].category?.push({
                id: item.category?.id || "Unknown",
                name: item.categoryName,
                color: item?.category?.color,
                icon: item?.category?.icon,
                value: Number(item.value || 0),
            });
        }
        return acc;
    }, {}));

    const total = grouped.length;
    const start = (page - 1) * limit;
    return {
        data: grouped.slice(start, start + limit),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
//#endregion