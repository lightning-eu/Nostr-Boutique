import tailwindcss from "@tailwindcss/vite";

const siteUrl = 'https://nostr.boutique'
const metaImageUrl = `${siteUrl}/Meta-Background.png`

export default defineNuxtConfig({
  title: "Nostr Boutique",

  compatibilityDate: "2025-12-01",

  vite: {
    vue: {
      customElement: true
    },
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'nostr-tools/pool',
        'nostr-tools/pure',
        'nostr-tools/nip19'
      ]
    },
    plugins: [
      tailwindcss()
    ]
  },

  app: {
    head: {
      title: "Nostr Boutique",
      meta: [
        { name: 'description', content: 'Launch a sovereign Nostr storefront with reusable Nsite themes, gateway discovery, and simple clone flows.' },
        { name: 'theme-color', content: '#f3efe6' },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: siteUrl },
        { property: 'og:site_name', content: 'Nostr Boutique' },
        { property: 'og:title', content: 'Nostr Boutique' },
        { property: 'og:description', content: 'Launch a sovereign Nostr storefront with reusable Nsite themes, gateway discovery, and simple clone flows.' },
        { property: 'og:image', content: metaImageUrl },
        { property: 'og:image:alt', content: 'Nostr Boutique storefront preview' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Nostr Boutique' },
        { name: 'twitter:description', content: 'Launch a sovereign Nostr storefront with reusable Nsite themes, gateway discovery, and simple clone flows.' },
        { name: 'twitter:image', content: metaImageUrl }
      ],
      link: [
        { rel: 'canonical', href: siteUrl },
        { rel: 'icon', type: 'image/png', href: '/Logo.png' }
      ],
      script: [
        {
          id: 'theme-init',
          children: "(function(){try{var t=localStorage.getItem('nostr-boutique-theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light')}catch(e){document.documentElement.setAttribute('data-theme','light')}})();"
        }
      ]
    }
  },

  devtools: { enabled: true },

  build: {
    transpile: ['vue3-odometer']
  },

  css: ['~/assets/tailwind.css'],

  modules: [
    "@pinia/nuxt"
  ]
})
