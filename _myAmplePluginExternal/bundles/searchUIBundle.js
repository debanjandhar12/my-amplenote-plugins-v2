import * as pkg1 from "react";
import * as pkg2 from "react-dom/client";
import { createPortal, flushSync, unmountComponentAtNode } from "react-dom";
import * as pkg3 from "@radix-ui/themes";
import * as pkg4 from "@radix-ui/react-icons";
import * as pkg5 from "react-virtuoso";
import * as pkgJson from "../package.json";

const modifiedPkg2 = {
    ...pkg2,
    createPortal,
    flushSync,
    unmountComponentAtNode
};

export const versions = {
    "react": pkgJson.dependencies["react"],
    "react-dom": pkgJson.dependencies["react-dom"],
    "@radix-ui/themes": pkgJson.dependencies["@radix-ui/themes"],
    "@radix-ui/react-icons": pkgJson.dependencies["@radix-ui/react-icons"],
    "react-virtuoso": pkgJson.dependencies["react-virtuoso"],
}

export default [pkg1, modifiedPkg2, pkg3, pkg4, pkg5];