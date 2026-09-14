import { defineConfig } from 'orval';

export default defineConfig({
    petstore: {
        input: {
            target: './openapi.json',
        },
        output: {
            mode: 'tags-split',
            target: './src/generated/api.ts',
            client: 'react-query',
            baseUrl: {
                // Pass the string expression exactly as it should look in your code
                runtime: "process.env.VITE_API_BASE_URL || 'http://localhost:7001'",
            },
        },
    },
});