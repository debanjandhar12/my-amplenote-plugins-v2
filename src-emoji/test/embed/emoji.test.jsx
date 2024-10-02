import {render, screen} from '@testing-library/react'
import '@testing-library/jest-dom'
import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {App} from "../../embed/emoji.jsx";

test('renders app', async () => {
    window.React = await dynamicImportESM("react");
    window.ReactDOM = await dynamicImportESM("react-dom");
    render(<App />)
    expect(screen.getByText('Hello World')).toBeInTheDocument()
});