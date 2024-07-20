import chartHTML from './embed/chart.html?inline';

const plugin = {
    async insertText(app) {
        await app.context.replaceSelection(`<object data="plugin://${ app.context.pluginUUID }" data-aspect-ratio="2" />`);
        return null;
    },
    renderEmbed(app, ...args) {
        return chartHTML;
    }
}

export default plugin;
