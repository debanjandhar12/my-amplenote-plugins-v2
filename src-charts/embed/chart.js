import {hideEmbedLoader, showEmbedLoader} from "../../common-utils/embed-ui.js";
import {addToolbar} from "./toolbar.js";
import {initChart} from "./renderer.js";
import {CHART_DATA_MOCK} from "../test/embed/chart.testdata.js";
import {createCallAmplenotePluginMock, deserializeWithFunctions} from "../../common-utils/embed-comunication.js";
import {EMBED_COMMANDS_MOCK} from "../test/embed/chart.testdata.js";

if(process.env.NODE_ENV === 'development') {
    window.chartData = window.chartData || CHART_DATA_MOCK;
    window.callAmplenotePlugin = window.callAmplenotePlugin || createCallAmplenotePluginMock(EMBED_COMMANDS_MOCK);
}
else {
    if (window.INJECTED_EMBED_COMMANDS_MOCK)
        window.callAmplenotePlugin = createCallAmplenotePluginMock(deserializeWithFunctions(window.INJECTED_EMBED_COMMANDS_MOCK));
    if (window.INJECTED_CHART_DATA_MOCK)
        window.chartData = deserializeWithFunctions(window.INJECTED_CHART_DATA_MOCK);
}

window.appConnector = new Proxy({}, {
    get: function(target, prop, receiver) {
        if (prop in target) {
            return target[prop];
        }
        return async function(...args) {
            return await window.callAmplenotePlugin(prop, ...args);
        };
    }
});
window.appSettings = window.appSettings || {};

(async () => {
    showEmbedLoader();
    await initChart();
    hideEmbedLoader();
    await addToolbar();
})();
