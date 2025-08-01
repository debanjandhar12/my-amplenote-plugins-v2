import * as pkg1 from "react";
import * as pkg2 from "react-dom/client";
import { createPortal, flushSync, unmountComponentAtNode } from "react-dom";
import * as pkg3 from "@assistant-ui/react";
import * as pkg4 from "@radix-ui/themes";
import * as pkg5 from "@assistant-ui/react-markdown";
import * as pkg6 from "@radix-ui/react-icons";
import * as pkg7 from "react-string-diff";
import * as pkg8 from "dayjs";
import * as pkg9 from "tributejs";
import * as pkg10 from "react-error-boundary";
import * as pkgJson from "../package.json";
import { splitLocalRuntimeOptions } from "../../node_modules/@assistant-ui/react/src/runtimes/local/LocalRuntimeOptions.tsx";
import { DangerousInBrowserAdapter } from "../../node_modules/@assistant-ui/react/src/runtimes/dangerous-in-browser/DangerousInBrowserAdapter.ts";

const modifiedPkg2 = {
    ...pkg2,
    splitLocalRuntimeOptions,
    createPortal,
    flushSync,
    unmountComponentAtNode
};

const customPkg11 = {
    splitLocalRuntimeOptions, DangerousInBrowserAdapter
}

export const versions = {
    "react": pkgJson.dependencies["react"],
    "react-dom": pkgJson.dependencies["react-dom"],
    "@assistant-ui/react": pkgJson.dependencies["@assistant-ui/react"],
    "@radix-ui/themes": pkgJson.dependencies["@radix-ui/themes"],
    "@assistant-ui/react-markdown": pkgJson.dependencies["@assistant-ui/react-markdown"],
    "@radix-ui/react-icons": pkgJson.dependencies["@radix-ui/react-icons"],
    "react-string-diff": pkgJson.dependencies["react-string-diff"],
    "dayjs": pkgJson.dependencies["dayjs"],
    "tributejs": pkgJson.dependencies["tributejs"],
    "react-error-boundary": pkgJson.dependencies["react-error-boundary"],
}

export default [pkg1, modifiedPkg2, pkg3, pkg4, pkg5, pkg6, pkg7, pkg8, pkg9, pkg10, customPkg11];