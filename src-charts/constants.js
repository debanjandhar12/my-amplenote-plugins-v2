import {z} from "zod";
import Formula from "fparser";

// Dialogs
export const TABLE_CHART_CONFIG_DIALOG = ["Enter chart type to create:", {
    inputs: [
        {
            label: "Chart type",
            type: "select",
            options: [
                { label: "Bar", value: "bar"},
                { label: "Line", value: "line"},
                { label: "Area", value: "area"},
                { label: "Pie", value: "pie"},
                { label: "Doughnut", value: "doughnut"},
                { label: "Polar Area", value: "polarArea"},
            ],
            value: "bar"
        },
        {
          label: "Data Source",
          type: "note",
          value: ""
        },
        {
            label: "Chart Title (optional)",
            type: "text",
            value: ""
        },
        {
            label: "Table Index in Note",
            type: "text",
            value: "0"
        },
        {
            label: "Horizontal (category) axis labels direction",
            type: "select",
            options: [
                { label: "Column", value: "column"},
                { label: "Row", value: "row"}
            ],
            value: "row"
        },
        {
            label: "Start from zero?",
            type: "checkbox",
            value: false
        },
        {
            label: "Chart aspect ratio size",
            type: "select",
            options: [
                { label: "1 (not recommended)", value: "1" },
                { label: "2", value: "2" },
                { label: "3", value: "3" }
            ],
            value: "2"
        }
    ]
}];

export const FORMULA_CHART_CONFIG_DIALOG = ["Enter chart type to create:", {
    inputs: [
        {
            label: "Chart type",
            type: "select",
            options: [
                { label: "Line", value: "line"},
                { label: "Area", value: "area"},
            ],
            value: "line"
        },
        {
            label: "Chart Title (optional)",
            type: "text",
            value: ""
        },
        {
            label: "Formula f(x)=",
            type: "text",
            value: "2x + 1"
        },
        {
            label: "minX",
            type: "text",
            value: "1"
        },
        {
            label: "maxX",
            type: "text",
            value: "20"
        },
        {
            label: "stepX",
            type: "text",
            value: "1"
        },
        {
            label: "Chart aspect ratio size",
            type: "select",
            options: [
                { label: "1 (not recommended)", value: "1" },
                { label: "2", value: "2" },
                { label: "3", value: "3" }
            ],
            value: "2"
        }
    ]
}];

// Zod Schemas
const chartTypeSchema = z.enum(['bar', 'line', 'area', 'pie', 'doughnut', 'polarArea']);
const formulaChartTypeSchema = z.enum(['line', 'area']);

const baseChartSchema = z.object({
    RANDOM_UUID: z.string(),
    DATA_SOURCE: z.enum(['note', 'formula']),
    CHART_TITLE: z.string(),
    CHART_ASPECT_RATIO_SIZE: z.string().refine(val => !isNaN(val) && !isNaN(parseFloat(val)), {
        message: 'Chart size must be a number',
    })
});

export const noteChartSchema = baseChartSchema.extend({
    CHART_TYPE: chartTypeSchema,
    DATA_SOURCE_NOTE_UUID: z.string(),
    TABLE_INDEX_IN_NOTE: z.string().refine(val => {
        const parsed = parseInt(val, 10);
        return !isNaN(parsed) && Number.isInteger(parsed) && parsed >= 1 && parsed <= 100;
    }, {
        message: 'Table Index must be an integer between 1 and 100 (inclusive)',
    }),
    HORIZONTAL_AXIS_LABEL_DIRECTION: z.enum(['column', 'row']),
    START_FROM_ZERO: z.boolean()
});

export const formulaChartSchema = baseChartSchema.extend({
    CHART_TYPE: formulaChartTypeSchema,
    DATA_SOURCE_FORMULA_F: z.string().refine((val) => {
        try {
            const fObj = new Formula(val);
            fObj.evaluate({ x: 1 });
            return true;
        } catch {
            return false;
        }
    }, 'Invalid formula'),
    MIN_X: z.string().refine(val => !isNaN(val) && !isNaN(parseFloat(val)), {
        message: 'minX must be a number',
    }),
    MAX_X: z.string().refine(val => !isNaN(val) && !isNaN(parseFloat(val)), {
        message: 'maxX must be a number',
    }),
    STEP_X: z.string().refine(val => !isNaN(val) && !isNaN(parseFloat(val)), {
        message: 'stepX must be a number',
    })
});

// Other constants
export const CHARTS_PLUGIN_VERSION = "1.0.1";

