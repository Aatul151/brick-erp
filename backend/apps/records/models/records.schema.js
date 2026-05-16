import {
    pgTable,
    uuid,
    varchar,
    date,
    time,
    integer,
    decimal,
    jsonb,
    timestamp,
    index,
    primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { tenants, users } from "../../../models/schema.js";

export const records = pgTable(
    "records",
    {
        id: uuid("id").defaultRandom().notNull(),
        tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade", }),
        accountName: varchar("account_name", { length: 250 }),
        categoryName: varchar("category_name", { length: 250 }),
        recordType: varchar("record_type", { length: 250 }).notNull(),
        value: decimal("value", { precision: 15, scale: 2 }),
        recordUnit: varchar("record_unit", { length: 15 }),
        entryDate: date("entry_date", { mode: "date" }).notNull(),
        entryTime: time("entry_time"),
        year: integer("year").generatedAlwaysAs(sql`EXTRACT(YEAR FROM entry_date)::integer`),
        month: integer("month").generatedAlwaysAs(sql`EXTRACT(MONTH FROM entry_date)::integer`),
        account: jsonb("account").notNull().default(sql`'{}'::jsonb`),
        category: jsonb("category").notNull().default(sql`'{}'::jsonb`),
        label: jsonb("label").notNull().default(sql`'{}'::jsonb`),
        remark: varchar("remark", { length: 1000 }),
        createdAt: timestamp("created_at", { withTimezone: true, }).notNull().defaultNow(),
        createdBy: integer("created_by").references(() => users.id, { onDelete: "set null", }),
        updatedAt: timestamp("updated_at", { withTimezone: true, }).notNull().defaultNow(),
        updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null", }),
    },
    (t) => ({
        pk: primaryKey({ columns: [t.id, t.entryDate] }),
        tenantEntryIdx: index("records_tenant_entry_idx").on(t.tenantId, t.entryDate),
        tenantTypeIdx: index("records_tenant_type_idx").on(t.tenantId, t.recordType),
    }),
);
