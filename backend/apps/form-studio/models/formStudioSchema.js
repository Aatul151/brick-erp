import { pgTable, serial, varchar, timestamp, integer, uuid, index, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { tenants, users } from "../../../models/schema.js";

/** Form definitions (tenant-scoped; PostgreSQL + JSONB for sections/settings). */
export const formDefinitions = pgTable(
    "form_definitions",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, {
                onDelete: "cascade",
            }),
        name: varchar("name", {
            length: 200,
        }).notNull(),
        title: varchar("title", {
            length: 500,
        }).notNull(),
        formType: varchar("form_type", {
            length: 20,
        })
            .notNull()
            .default("custom"),
        collectionName: varchar("collection_name", {
            length: 200,
        }),
        sections: jsonb("sections")
            .notNull()
            .default(sql`'[]'::jsonb`),
        settings: jsonb("settings").default(sql`'{}'::jsonb`),
        createdBy: integer("created_by").references(() => users.id, {
            onDelete: "set null",
        }),
        updatedBy: integer("updated_by").references(() => users.id, {
            onDelete: "set null",
        }),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        tenantNameUnique: uniqueIndex("form_def_tenant_name_uidx").on(table.tenantId, table.name),
        tenantIdx: index("form_def_tenant_idx").on(table.tenantId),
    }),
);

export const formEntries = pgTable(
    "form_entries",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, {
                onDelete: "cascade",
            }),
        formDefinitionId: uuid("form_definition_id")
            .notNull()
            .references(() => formDefinitions.id, {
                onDelete: "cascade",
            }),
        payload: jsonb("payload")
            .notNull()
            .default(sql`'{}'::jsonb`),
        createdBy: integer("created_by").references(() => users.id, {
            onDelete: "set null",
        }),
        updatedBy: integer("updated_by").references(() => users.id, {
            onDelete: "set null",
        }),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        tenantFormCreatedIdx: index("form_entries_tenant_form_created_idx").on(table.tenantId, table.formDefinitionId, table.createdAt),
        payloadIdx: index("form_entries_payload_gin_idx").using("gin", table.payload),
    }),
);

export const masterFormEntries = pgTable(
    "master_form_entries",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        formName: varchar("form_name", {
            length: 200,
        }).notNull(),
        payload: jsonb("payload")
            .notNull()
            .default(sql`'{}'::jsonb`),
        createdBy: integer("created_by").references(() => users.id, {
            onDelete: "set null",
        }),
        updatedBy: integer("updated_by").references(() => users.id, {
            onDelete: "set null",
        }),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp("updated_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        formNameCreatedIdx: index("master_form_entries_form_created_idx").on(table.formName, table.createdAt),
        payloadIdx: index("master_form_entries_payload_gin_idx").using("gin", table.payload),
    }),
);

/** Metadata for uploaded form files (binary stored on disk under uploads/). */
export const formUploadedFiles = pgTable(
    "form_uploaded_files",
    {
        id: serial("id").primaryKey(),
        tenantId: uuid("tenant_id")
            .notNull()
            .references(() => tenants.id, {
                onDelete: "cascade",
            }),
        formName: varchar("form_name", {
            length: 200,
        }).notNull(),
        fieldName: varchar("field_name", {
            length: 200,
        }).notNull(),
        publicId: varchar("public_id", {
            length: 20,
        })
            .notNull()
            .unique(),
        storagePath: varchar("storage_path", {
            length: 1000,
        }).notNull(),
        originalName: varchar("original_name", {
            length: 500,
        }).notNull(),
        fileName: varchar("file_name", {
            length: 255,
        }).notNull(),
        mimeType: varchar("mime_type", {
            length: 200,
        }),
        size: integer("size"),
        uploadedBy: integer("uploaded_by").references(() => users.id, {
            onDelete: "set null",
        }),
        createdAt: timestamp("created_at", {
            withTimezone: true,
        })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        tenantIdx: index("form_upload_tenant_idx").on(table.tenantId),
    }),
);

export const formDefinitionsRelations = relations(formDefinitions, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [formDefinitions.tenantId],
        references: [tenants.id],
    }),
    createdByUser: one(users, {
        fields: [formDefinitions.createdBy],
        references: [users.id],
    }),
    entries: many(formEntries),
}));

export const formEntriesRelations = relations(formEntries, ({ one }) => ({
    formDefinition: one(formDefinitions, {
        fields: [formEntries.formDefinitionId],
        references: [formDefinitions.id],
    }),
    tenant: one(tenants, {
        fields: [formEntries.tenantId],
        references: [tenants.id],
    }),
    createdByUser: one(users, {
        fields: [formEntries.createdBy],
        references: [users.id],
        relationName: "formEntryCreatedBy",
    }),
    updatedByUser: one(users, {
        fields: [formEntries.updatedBy],
        references: [users.id],
        relationName: "formEntryUpdatedBy",
    }),
}));

export const masterFormEntriesRelations = relations(masterFormEntries, ({ one }) => ({
    createdByUser: one(users, {
        fields: [masterFormEntries.createdBy],
        references: [users.id],
        relationName: "masterFormEntryCreatedBy",
    }),
    updatedByUser: one(users, {
        fields: [masterFormEntries.updatedBy],
        references: [users.id],
        relationName: "masterFormEntryUpdatedBy",
    }),
}));

export const formUploadedFilesRelations = relations(formUploadedFiles, ({ one }) => ({
    tenant: one(tenants, {
        fields: [formUploadedFiles.tenantId],
        references: [tenants.id],
    }),
}));
