import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react'; // Import the React plugin

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.jsx'], // Change to .jsx
            refresh: true,
        }),
        react(), // Add the React plugin here
    ],
});