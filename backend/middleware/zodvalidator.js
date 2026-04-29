export const zodValidator = (schema) => {
    return async (req, res, next) => {
        try {
            const validated = await schema.parseAsync(req.body);
            req.body = validated;
            next();
        } catch (error) {
            return res.status(400).json({
                error: "Validation failed",
                details: error.errors.map((e) => ({
                    field: e.path.join("."),
                    message: e.message,
                })),
            });
        }
    };
};
