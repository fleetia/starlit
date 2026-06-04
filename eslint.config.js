import { reactConfig, ignorePatterns } from "@fleetia/config/eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([globalIgnores(ignorePatterns), reactConfig]);
