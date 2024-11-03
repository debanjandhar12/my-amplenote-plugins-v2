import {OMNIVORE_API_ENDPOINT_SETTING, OMNIVORE_API_ENDPOINT_SETTING_DEFAULT} from "../constants.js";

export const getOmnivoreAppUrl = (appSettings) => {
    const apiUrl = getOmnivoreApiUrl(appSettings);
    if (!apiUrl) return null;
    let apiUrlLowerCase = apiUrl.toLowerCase();

    if (apiUrlLowerCase.includes('/api/graphql')) {
        apiUrlLowerCase = apiUrlLowerCase.replace('/api/graphql', '');
    }
    else if (apiUrlLowerCase.includes('/api')) {
        apiUrlLowerCase = apiUrlLowerCase.replace('/api', '');
    }
    else if (apiUrlLowerCase.includes('/graphql')) {
        apiUrlLowerCase = apiUrlLowerCase.replace('/graphql', '');
    }
    else if (apiUrlLowerCase.includes('/graphql/api')) {
        apiUrlLowerCase = apiUrlLowerCase.replace('/graphql/api', '');
    }

    if (apiUrlLowerCase.match(/^https:\/\/api.*\.(.*\..*)/)[1]) { // remove https://api*.omnivore.app - use regex
        apiUrlLowerCase = apiUrlLowerCase.match(/^https:\/\/api.*\.(.*\..*)/)[1];
    }
    return apiUrlLowerCase;
}

export const getOmnivoreApiUrl = (appSettings) => {
    return appSettings[OMNIVORE_API_ENDPOINT_SETTING]?.trim() || OMNIVORE_API_ENDPOINT_SETTING_DEFAULT;
}