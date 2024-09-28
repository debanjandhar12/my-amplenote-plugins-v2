export const EMBED_COMMANDS_MOCK = {
    "getSettings": async () => {
        return {};
    },
    "setSetting": async (key, value) => {
        return value;
    },
    "getNoteContentByUUID": async (noteUUID) => {
        return "| | | |\n|-|-|-|\n| |Company A|Company B|\n|Jan|1|2|\n|Feb|2|2|"
    },
    "prompt": async (message, options) => {
        return new Promise((resolve) => {
            const userInput = window.prompt(message, options.defaultValue || '');

            if (userInput === null) {
                resolve(null);
            } else {
                resolve(userInput);
            }
        });
    }
}

export const CHART_DATA_MOCK = {
    DATA_SOURCE: 'note',
    CHART_TYPE: 'bar',
    DATA_SOURCE_NOTE_UUID: 'mock-uuid',
    DATA_SOURCE_HEADER_FILTER: '',
    CHART_TITLE: "Title for chart",
    TABLE_INDEX_IN_NOTE: 0,
    HORIZONTAL_AXIS_LABEL_DIRECTION: 'row',
    START_FROM_ZERO: true,
    CHART_ASPECT_RATIO_SIZE: '2'
}

export const CHART_FORMULA_DATA_MOCK = {
    DATA_SOURCE: 'formula',
    CHART_TYPE: 'line',
    CHART_TITLE: "Title for chart",
    MIN_X: 0,
    MAX_X: 10,
    STEP_X: 1,
    DATA_SOURCE_FORMULA_F: 'x',
    CHART_ASPECT_RATIO_SIZE: '2'
}