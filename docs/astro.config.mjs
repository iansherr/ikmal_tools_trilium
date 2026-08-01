import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [
    starlight({
      title: 'Ikmal Tools for Trilium Docs',
      social: {
        github: 'https://github.com/iansherr/ikmal_tools',
      },
      sidebar: [
        {
          label: 'User Guides',
          items: [
            { label: 'Getting Started', link: '/user-guide/01-getting-started/' },
            { label: 'Today Dashboard', link: '/user-guide/02-today-dashboard/' },
            { label: 'Template Studio & Rules', link: '/user-guide/03-template-studio/' },
            { label: 'Quick Capture & Hotkey', link: '/user-guide/04-quick-capture/' },
            { label: 'Micro-Tools Suite', link: '/user-guide/05-micro-tools/' },
            { label: 'LanguageTool for Trilium', link: '/user-guide/06-languagetool-plugin/' },
          ],
        },
        {
          label: 'Developer Guides',
          items: [
            { label: 'Architecture Overview', link: '/developer-guide/01-architecture/' },
            { label: 'FleetSync Bridge Spec', link: '/developer-guide/02-fleetsync-bridge/' },
            { label: 'Building & Testing', link: '/developer-guide/03-building-and-testing/' },
            { label: 'Extending Templates', link: '/developer-guide/04-extending-templates/' },
            { label: 'LanguageTool Integration', link: '/developer-guide/05-languagetool-integration/' },
          ],
        },
      ],
    }),
  ],
});
