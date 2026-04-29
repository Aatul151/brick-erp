import { formEntriesApi, fileUploadApi } from "../api/coreapi";
import { apiReferenceService } from "./apiReferenceService";
import { CKEditorContentDisplay } from "../../components/form-studio/renders/CKEditorContentDisplay";
import { FileDisplay } from "../../components/form-studio/renders/FileDisplay";

/**
 * Build services for @aatulwork/customform-renderer.
 * @param {{ recordId?: string | number | null }} [options] - Entry id for uploads under .../record_id/; defaults to `draft` for new records.
 */
export function createFormRendererServices(options = {}) {
    const recordId = options.recordId != null && String(options.recordId).trim() !== "" ? String(options.recordId).trim() : "draft";

    return {
        formReference: {
            fetchOptions: async (formName, fieldName) => {
                try {
                    const fieldsToSelect = ["_id", `payload.${fieldName}`];
                    const response = await formEntriesApi.getAll({
                        formName,
                        page: 1,
                        limit: 1000,
                        fields: fieldsToSelect,
                    });
                    const entries = response.data || [];
                    return entries.map((entry) => {
                        const labelValue = entry.payload?.[fieldName] ?? entry[fieldName] ?? `Entry ${entry._id?.substring(0, 8) ?? "Unknown"}`;
                        return {
                            label: String(labelValue),
                            value: entry._id ?? "",
                        };
                    });
                } catch (e) {
                    console.error(`formReference.fetchOptions(${formName}):`, e);
                    return [];
                }
            },
        },
        apiReference: {
            fetchOptions: (endpoint, labelField, valueField = "_id") => apiReferenceService.fetchOptions(endpoint, labelField, valueField),
        },
        fileUpload: {
            uploadFiles: (formName, fieldName, files) => fileUploadApi.uploadFiles(formName, fieldName, files, recordId),
        },
        fileBaseUrl: import.meta.env.VITE_FILE_BASE_URL || import.meta.env.VITE_API_URL || "",
        ckEditorLicenseKey: import.meta.env.VITE_CKEDITOR_LICENSE_KEY,
        CKEditorDisplayComponent: CKEditorContentDisplay,
        FileDisplayComponent: FileDisplay,
    };
}

/** Default services (uploads use record folder `draft`). */
export const formRendererServices = createFormRendererServices();
