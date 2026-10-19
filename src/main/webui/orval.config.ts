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
                // Empty origin uses the generated /api/... paths on the current host.
                runtime: "import.meta.env.VITE_API_BASE_URL || ''",
            },
        },
    },
});
