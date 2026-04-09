import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
    js.configs.recommended,
    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: { jsx: true },
                ecmaVersion: 2020,
                sourceType: "module",
            },
            globals: {
                window: true,
                document: true,
                navigator: true,
                localStorage: true,
                setTimeout: true,
                clearTimeout: true,
                console: true
            }
        },
        plugins: {
            "@typescript-eslint": tsPlugin,
            "react-hooks": reactHooksPlugin,
        },
        rules: {
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "no-unused-vars": "off",
            "no-undef": "off",
            "no-empty": "off",
            "no-inner-declarations": "off"
        },
    },
];
