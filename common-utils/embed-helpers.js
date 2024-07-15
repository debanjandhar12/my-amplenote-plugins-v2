import { JSDOM } from 'jsdom';

export const addVariableToHtmlString = (htmlString, variableName, variableValue) => {
    const dom = new JSDOM(htmlString);
    const document = dom.window.document;

    const script = document.createElement('script');
    script.textContent = `var ${variableName} = ${JSON.stringify(variableValue)};`;

    const head = document.head || document.getElementsByTagName('head')[0];

    if (head.firstChild) {
        head.insertBefore(script, head.firstChild);
    } else {
        head.appendChild(script);
    }

    return dom.serialize();
};