export const addScriptToHtmlString = (htmlString, scriptContent) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    const script = doc.createElement('script');
    script.textContent = scriptContent;

    const head = doc.head;
    if (head.firstChild) {
        head.insertBefore(script, head.firstChild);
    } else {
        head.appendChild(script);
    }

    return doc.documentElement.outerHTML.replaceAll('\\x3Cscript>', () => '<script>');
};

export const addWindowVariableToHtmlString = (htmlString, variableName, variableValue) => {
    const scriptContent = `window.${variableName} = ${JSON.stringify(variableValue)};`;

    return addScriptToHtmlString(htmlString, scriptContent);
};