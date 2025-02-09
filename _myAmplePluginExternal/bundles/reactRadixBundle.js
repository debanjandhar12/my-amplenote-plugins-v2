import * as pkg1 from "react";
import * as pkg2 from "react-dom/client";
import * as pkg3 from "@radix-ui/themes";
import * as pkg4 from "@radix-ui/react-icons";
import * as pkgJson from "../package.json";

export const versions = {
    "react": pkgJson.dependencies["react"],
    "react-dom": pkgJson.dependencies["react-dom"],
    "@radix-ui/themes": pkgJson.dependencies["@radix-ui/themes"],
    "@radix-ui/react-icons": pkgJson.dependencies["@radix-ui/react-icons"],
}

export default [pkg1, pkg2, pkg3, pkg4];