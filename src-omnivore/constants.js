// Default Setting Values
export const OMNIVORE_DASHBOARD_NOTE_TITLE_DEFAULT = 'Omnivore Library Dashboard';
export const OMNIVORE_DASHBOARD_ORDER_SETTING_DEFAULT = 'updatedAt-desc';
export const NOTE_HIGHLIGHT_ORDER_SETTING_DEFAULT = 'updatedAt-desc';
export const BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING_DEFAULT = 'omnivore';
export const OMNIVORE_DASHBOARD_COLUMNS_SETTING_DEFAULT = 'Author, UpdatedAt';
export const SYNC_ARTICLE_CONTENT_SETTING_DEFAULT = 'false';
export const OMNIVORE_API_ENDPOINT_SETTING_DEFAULT = "https://api-prod.omnivore.app/api/graphql";

// Setting Titles
export const OMNIVORE_DASHBOARD_NOTE_TITLE_SETTING = `Omnivore dashboard note title (default: "${OMNIVORE_DASHBOARD_NOTE_TITLE_DEFAULT}")`;
export const OMNIVORE_DASHBOARD_ORDER_SETTING = `Omnivore dashboard order ("updatedAt-asc" or "updatedAt-desc" or "savedAt-asc" or "savedAt-desc"). Default: "${OMNIVORE_DASHBOARD_ORDER_SETTING_DEFAULT}")`;
export const OMNIVORE_DASHBOARD_COLUMNS_SETTING = `Omnivore dashboard columns (comma separated list of: "Author", "Description", "UpdatedAt", "SavedAt", "PageType", "ReadingProgressPercent") (default: "${OMNIVORE_DASHBOARD_COLUMNS_SETTING_DEFAULT}")`;
export const BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING = `Base tag for highlight note (default: "${BASE_TAG_FOR_HIGHLIGHT_NOTE_SETTING_DEFAULT}")`;
export const NOTE_HIGHLIGHT_ORDER_SETTING = `Highlight order ("updatedAt-asc" or "updatedAt-desc". Default: "${NOTE_HIGHLIGHT_ORDER_SETTING_DEFAULT}")`;
export const SYNC_ARTICLE_CONTENT_SETTING = `Sync article content (true or false). Default: "${SYNC_ARTICLE_CONTENT_SETTING_DEFAULT}"`;
export const OMNIVORE_API_KEY_SETTING = "Omnivore API Key";
export const OMNIVORE_API_ENDPOINT_SETTING = "Omnivore API URL";

// Other constants
export const AMPLENOTE_INSERT_CONTENT_LIMIT = 90000;
export const OMNIVORE_SYNC_BATCH_SIZE = 30;
