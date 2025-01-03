import * as AssistantUI from "@assistant-ui/react";
import {StringDiff} from "react-string-diff";
import Tribute from "tributejs";
import ReactDOM = require("react-dom/client");
import React = require("react");
import * as AssistantUIMarkdown from "@assistant-ui/react-markdown";
import * as RadixUI from "@radix-ui/themes";
import * as RadixIcons from "@radix-ui/react-icons";
import {splitLocalRuntimeOptions} from "@assistant-ui/react/dist/runtimes/local/LocalRuntimeOptions";
import {
    DangerousInBrowserAdapter
} from "@assistant-ui/react/dist/runtimes/dangerous-in-browser/DangerousInBrowserAdapter";

declare global {
    interface Window {
        AssistantUI: typeof AssistantUI;
        React: typeof React;
        ReactDOM: typeof ReactDOM;
        RadixUI: typeof RadixUI;
        RadixIcons: typeof RadixIcons;
        Tribute: typeof Tribute;
        StringDiff: typeof StringDiff;
        AssistantUIUtils: {
            DangerousInBrowserAdapter: typeof DangerousInBrowserAdapter;
            splitLocalRuntimeOptions: typeof splitLocalRuntimeOptions;
        }
        AssistantUIMarkdown: typeof AssistantUIMarkdown;
        appSettings: Record<string, any>;
    }
}

export {};