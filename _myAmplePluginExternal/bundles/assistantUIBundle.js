import * as pkg1 from "react";
import * as pkg2 from "react-dom/client";
import * as pkg3 from "@assistant-ui/react";
import * as pkg4 from "@radix-ui/themes";
import * as pkg5 from "@assistant-ui/react-markdown";
import * as pkg6 from "@radix-ui/react-icons";
import * as pkg7 from "react-string-diff";
import * as pkgJson from "../package.json";

export const versions = {
    "react": pkgJson.dependencies["react"],
    "react-dom": pkgJson.dependencies["react-dom"],
    "@assistant-ui/react": pkgJson.dependencies["@assistant-ui/react"],
    "@radix-ui/themes": pkgJson.dependencies["@radix-ui/themes"],
    "@assistant-ui/react-markdown": pkgJson.dependencies["@assistant-ui/react-markdown"],
    "@radix-ui/react-icons": pkgJson.dependencies["@radix-ui/react-icons"],
    "react-string-diff": pkgJson.dependencies["react-string-diff"],
}

export default [pkg1, pkg2, pkg3, pkg4, pkg5, pkg6, pkg7];