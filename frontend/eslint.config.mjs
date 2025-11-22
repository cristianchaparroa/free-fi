import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

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

    // Custom rules
    {
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "indent": "off",
            "key-spacing": ["error", { afterColon: true }],
        },
    },
];

export default eslintConfig;
