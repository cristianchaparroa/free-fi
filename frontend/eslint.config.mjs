import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import unusedImports from "eslint-plugin-unused-imports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    // Ignore build artifacts and other generated stuff globally
    {
        ignores: [
            "node_modules/**",
            ".next/**",
            "out/**",
            "build/**",
            "next-env.d.ts",
        ],
    },

    // Extend Next.js + TypeScript configs
    ...compat.extends("next/core-web-vitals", "next/typescript"),

    // Custom rules and plugins
    {
        plugins: {
            "unused-imports": unusedImports,
        },
        rules: {
            "unused-imports/no-unused-imports": "error",
            "key-spacing": ["error", { afterColon: true }],
            "indent": ["error", 4],
        },
    },
];

export default eslintConfig;
