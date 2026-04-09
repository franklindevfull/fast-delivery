import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Register ts-node loader for ESM support in Node 22+
register("ts-node/esm", pathToFileURL("./"));
