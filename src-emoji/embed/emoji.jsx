import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";

const App = () => {
    return <div>Hello World</div>;
};

(async () => {
    window.React = await dynamicImportESM("react");
    window.ReactDOM = await dynamicImportESM("react-dom");

    if (!React || !ReactDOM) {
        throw new Error("Failed to load React or ReactDOM");
    }
    ReactDOM.render(React.createElement(App), document.querySelector('.app-container'));
})();

