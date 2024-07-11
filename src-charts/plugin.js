import a from 'inline:./embed/index.html';

const plugin = {
    async insertText(app) {
        // `app.context.pluginUUID` is always supplied - it is the UUID of the plugin note
        //await app.context.replaceSelection(`<object data="plugin://${ app.context.pluginUUID }" data-aspect-ratio="2" />`);
        app.openSidebarEmbed(1, "one", [ 2, 3, 4 ]);
        // log current page contents
        console.log(app);

        return null;
    },
    renderEmbed(app, ...args) {
        return a;
    }
}

export default plugin;
