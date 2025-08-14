import * as pkg1 from "react";
import * as pkg2 from "react-dom/client";
import * as pkg3 from "@emoji-mart/react";
import * as pkg4 from "@emoji-mart/data";
import * as pkgJson from "../package.json";

export const versions = {
    "react": pkgJson.dependencies["react"],
    "react-dom": pkgJson.dependencies["react-dom"],
    "@emoji-mart/react": pkgJson.dependencies["@emoji-mart/react"],
    "@emoji-mart/data": pkgJson.dependencies["@emoji-mart/data"]
}

export default [pkg1, pkg2, pkg3, pkg4];