import fs from 'node:fs/promises';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import license from 'rollup-plugin-license';

const licensecontent = await fs.readFile(new URL('LICENSE.md', import.meta.url), {
  encoding: 'utf-8',
});
export default defineConfig({
  plugins: [sveltekit()],
  build: {
    rollupOptions: {
      plugins: [
        license({
          sourcemap: true,

          banner: {
            commentStyle: 'ignored',
            content: `
              ${licensecontent}

              This bundle contains code from various dependencies licensed as follows:

              <% _.forEach(dependencies, function (dependency) { %>
              = <%= dependency.name %> v<%= dependency.version %>

              <%= dependency.licenseText %>
              <% }) %>
            `,
          },
        }),
      ],
    },
  },
});
