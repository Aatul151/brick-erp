import { z } from "zod";

const jsonObjectField = () =>
    z.preprocess(
        (v) => {
            if (v === undefined || v === null) return {};
            return v;
        },
        z.union([z.record(z.string(), z.any()), z.array(z.any())])
    );

export const createLabourSchema = z.object({
    labourType: z.string().max(100).optional().nullable(),
    fullName: z.string().min(1, "fullName is required").max(250),
    mobileNumber: z.string().max(20).optional().nullable(),
    mobileNumber2: z.string().max(20).optional().nullable(),
    gender: z.string().max(20).optional().nullable(),
    address: z.string().max(1000).optional().nullable(),
    aadhaarNumber: z.string().max(30).optional().nullable(),
    defaultRate: z.coerce.number().finite().optional().nullable(),
    brickBuilderRate: z.coerce.number().finite().optional().nullable(),
    brickMoverRate: z.coerce.number().finite().optional().nullable(),
    sapaRate: z.coerce.number().finite().optional().nullable(),
    rojRate: z.coerce.number().finite().optional().nullable(),
    metadata: jsonObjectField().optional(),
    remark: z.string().max(1000).optional().nullable(),
});

export const updateLabourSchema = z.object({
    labourType: z.string().max(100).optional().nullable(),
    fullName: z.string().min(1).max(250).optional(),
    mobileNumber: z.string().max(20).optional().nullable(),
    mobileNumber2: z.string().max(20).optional().nullable(),
    gender: z.string().max(20).optional().nullable(),
    address: z.string().max(1000).optional().nullable(),
    aadhaarNumber: z.string().max(30).optional().nullable(),
    defaultRate: z.coerce.number().finite().optional().nullable(),
    brickBuilderRate: z.coerce.number().finite().optional().nullable(),
    brickMoverRate: z.coerce.number().finite().optional().nullable(),
    sapaRate: z.coerce.number().finite().optional().nullable(),
    rojRate: z.coerce.number().finite().optional().nullable(),
    metadata: jsonObjectField().optional(),
    remark: z.string().max(1000).optional().nullable(),
});

export const listLaboursQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(500).default(20),
    labourCode: z.string().max(50).optional(),
    labourType: z.string().max(100).optional(),
    fullName: z.string().max(250).optional(),
});
