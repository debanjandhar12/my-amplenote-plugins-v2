import chartHTML from 'inline:./embed/chart.html';

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
