<script setup>
const exampleCloudUrl = 'https://npub1equrmqway3qxw3dkssymusxkwgwrqypfgeqx0lx9pgjam7gnj4ysaqhkj6.nsite.cloud/'
const exampleRunUrl = 'https://npub1equrmqway3qxw3dkssymusxkwgwrqypfgeqx0lx9pgjam7gnj4ysaqhkj6.nsite.run/'
const exampleLolUrl = 'https://npub1equrmqway3qxw3dkssymusxkwgwrqypfgeqx0lx9pgjam7gnj4ysaqhkj6.nsite.lol/'
const exampleBoutiqueUrl = 'https://npub1equrmqway3qxw3dkssymusxkwgwrqypfgeqx0lx9pgjam7gnj4ysaqhkj6.nsite.boutique/'
const examplePortalCloudUrl = 'https://npub1jegt4wpzxlwzy6p35767vjk5qxqw7udw0zl2z9frz4tku67qwfrsf2altc.nsite.cloud/'
const examplePreviewUrl = 'https://npub1cwhy4k8qd2guyqz8t45u4yzyp4k4fhnjn573ukh6e77mde2dgm9s2lujc5.nsite.run/'

const previewUrl = ref(examplePreviewUrl)
const frameScale = 0.92

useSeoMeta({
  title: 'Example | Nostr Boutique',
  description: 'View a live Nsite deployment that demonstrates the Nostr Boutique template direction.'
})
</script>

<template>
  <section class="fade-in-up space-y-4">
    <article class="surface-card p-6 sm:p-8">
      <span class="pill">Reference deployment</span>
      <h1 class="hero-title mt-4 text-4xl font-black leading-tight">See a live Gamma-style Nsite.</h1>
      <p class="mt-4 text-sm sm:text-base" :style="{ color: 'var(--muted)' }">
        This example is the public storefront used as a proof point for this landing site.
        You can open it directly and inspect how a Nostr-hosted merchant surface behaves.
      </p>

      <div class="mt-6 flex flex-wrap gap-3">
        <a
          :href="exampleRunUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="cta-primary inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-black"
        >
          Open live example
        </a>
        <a
          :href="examplePortalCloudUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-bold"
          :style="{ borderColor: 'var(--line)' }"
        >
          Open merchant portal
        </a>
        <a
          :href="exampleCloudUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-bold"
          :style="{ borderColor: 'var(--line)' }"
        >
          Open via nsite.cloud
        </a>
        <a
          :href="exampleLolUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-bold"
          :style="{ borderColor: 'var(--line)' }"
        >
          Open via nsite.lol
        </a>
        <a
          :href="exampleBoutiqueUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-bold"
          :style="{ borderColor: 'var(--line)' }"
        >
          Open via nsite.boutique 🛍️
        </a>
        <NuxtLink to="/explore" class="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-bold" :style="{ borderColor: 'var(--line)' }">
          Explore related Nsites
        </NuxtLink>
      </div>

    </article>

    <article class="surface-card overflow-hidden p-2">
      <div class="mb-3 flex items-center gap-2 border px-3 py-2" :style="{ borderColor: 'var(--line)' }">
        <span class="h-2.5 w-2.5 rounded-full" :style="{ background: 'var(--muted)' }" />
        <span class="h-2.5 w-2.5 rounded-full" :style="{ background: 'var(--muted)' }" />
        <span class="h-2.5 w-2.5 rounded-full" :style="{ background: 'var(--muted)' }" />
        <span class="ml-2 truncate text-xs" :style="{ color: 'var(--muted)' }">{{ previewUrl }}</span>
      </div>

      <div class="overflow-hidden rounded-xl border" :style="{ borderColor: 'var(--line)' }">
        <iframe
          title="Nostr Boutique Example Nsite"
          :src="previewUrl"
          class="h-[90vh]"
          :style="{ width: `${100 / frameScale}%`, transform: `scale(${frameScale})`, transformOrigin: 'top left' }"
          loading="lazy"
        />
      </div>
    </article>
  </section>

  <section class="mt-6 grid gap-4 md:grid-cols-3">
    <article class="panel">
      <h2 class="text-base font-black">Real deployment</h2>
      <p class="mt-2 text-sm" :style="{ color: 'var(--muted)' }">Not a mockup. This is a live nsite URL visitors can test.</p>
    </article>
    <article class="panel">
      <h2 class="text-base font-black">Works on gateways</h2>
      <p class="mt-2 text-sm" :style="{ color: 'var(--muted)' }">Accessed through gateway infrastructure so regular browsers can render it via nsite.cloud, nsite.run, nsite.lol, and nsite.boutique 🛍️.</p>
    </article>
    <article class="panel">
      <h2 class="text-base font-black">Template reference</h2>
      <p class="mt-2 text-sm" :style="{ color: 'var(--muted)' }">Use this as the baseline behavior while shaping your own storefront.</p>
    </article>
  </section>
</template>
