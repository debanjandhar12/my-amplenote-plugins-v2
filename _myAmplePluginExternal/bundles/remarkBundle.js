import * as pkg1 from "remark-gfm";
import * as pkg2 from "unified";
import * as pkg3 from "remark-frontmatter";
import * as pkg4 from "remark-parse";
import * as pkgJson from "../package.json";

export const versions = {
    "remark-gfm": pkgJson.dependencies["remark-gfm"],
    "unified": pkgJson.dependencies["unified"],
    "remark-frontmatter": pkgJson.dependencies["remark-frontmatter"],
    "remark-parse": pkgJson.dependencies["remark-parse"],
}

export default [pkg1, pkg2, pkg3, pkg4];