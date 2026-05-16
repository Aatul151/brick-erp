import { z } from "zod";

const uuidStr = z.string().uuid("Invalid UUID");

const dateStr = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "entryDate must be YYYY-MM-DD");

const timeStr = z.preprocess(
    (v) => (v === "" ? null : v),
    z
        .union([
            z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "entryTime must be HH:MM or HH:MM:SS"),
            z.null(),
        ])
        .optional(),
);

function jsonObjectField() {
    return z.preprocess(
        (v) => {
            if (v === undefined || v === null) return {};
            return v;
        },
        z.record(z.string(), z.any()).refine((v) => typeof v === "object" && v !== null && !Array.isArray(v), {
            message: "Must be a JSON object",
        }),
    );
}

export const createRecordSchema = z.object({
    tenantId: uuidStr,
    recordType: z.string().min(1, "recordType is required").max(250),
    recordUnit: z.string().max(15).optional().nullable(),
    value: z.coerce.number().finite().optional().nullable(),
    entryDate: dateStr,
    entryTime: timeStr,
    account: jsonObjectField().optional(),
    category: jsonObjectField().optional(),
    label: jsonObjectField().optional(),
    remark: z.string().max(1000).optional().nullable(),
});

export const updateRecordSchema = z.object({
    entryDate: dateStr.optional(),
    recordType: z.string().min(1).max(250).optional(),
    recordUnit: z.string().max(15).optional().nullable(),
    value: z.coerce.number().finite().optional().nullable(),
    entryTime: timeStr,
    account: jsonObjectField().optional(),
    category: jsonObjectField().optional(),
    label: jsonObjectField().optional(),
    remark: z.string().max(1000).optional().nullable(),
});

export const listRecordsQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(20),
    recordType: z.string().max(250).optional(),
    entryDateFrom: dateStr.optional(),
    entryDateTo: dateStr.optional(),
});
