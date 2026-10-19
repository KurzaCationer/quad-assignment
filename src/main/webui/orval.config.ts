import { defineConfig } from 'orval';

export default defineConfig({
    petstore: {
        input: {
            target: './openapi.json',
        },
        output: {
            clean: true,
            mode: 'tags-split',
            target: './src/generated/api.ts',
            client: 'react-query',
            baseUrl: {
                // Use the current host unless overridden.
                runtime: "import.meta.env.VITE_API_BASE_URL || ''",
            },
        },
    },
});
