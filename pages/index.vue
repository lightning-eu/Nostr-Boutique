<script setup>
const discoveredSites = ref([])
const statsLoading = ref(true)
const statsError = ref('')
const productsLoaded = ref(0)

const { fetchTemplateSites } = useNsiteExplore()

const imageBackedSites = computed(() => {
  return discoveredSites.value.filter((site) => typeof site.profileImage === 'string' && site.profileImage.trim() !== '')
})

const productsListed = computed(() => {
  return imageBackedSites.value.reduce((total, site) => total + (site.productCount || 0), 0)
})

const loadHomeStats = async () => {
  try {
    statsLoading.value = true
    statsError.value = ''
    discoveredSites.value = []
    productsLoaded.value = 0

    discoveredSites.value = await fetchTemplateSites({
      onProgress: ({ sites: nextSites }) => {
        discoveredSites.value = nextSites
        productsLoaded.value = nextSites
          .filter((site) => typeof site.profileImage === 'string' && site.profileImage.trim() !== '')
          .reduce((total, site) => total + (site.productCount || 0), 0)
      }
    })

    productsLoaded.value = productsListed.value
  } catch (error) {
    statsError.value = error.message || 'Could not load discovery stats right now.'
  } finally {
    statsLoading.value = false
  }
}

onMounted(async () => {
  await loadHomeStats()
})

useSeoMeta({
  title: 'Nostr Boutique',
  description: 'Host your own self sovereign shop.'
})
</script>

<template>
  <section class="w-full pb-14 text-center sm:pb-20">
    <div
      class="hero-panel relative w-full overflow-hidden bg-cover bg-center px-4 py-8 sm:px-8 sm:py-10"
    >
      <div class="mx-auto max-w-3xl">
        <NsiteClonePanel />
      </div>
    </div>

    <div class="mx-auto mt-8 w-full max-w-7xl px-2 text-left md:px-4 lg:px-0">
      <div class="mb-8">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-lg font-black sm:text-xl">Live boutique stats</h2>
          <button
            type="button"
            class="rounded-full border px-3 py-1.5 text-xs font-bold"
            :style="{ borderColor: 'var(--line)' }"
            :disabled="statsLoading"
            @click="loadHomeStats"
          >
            {{ statsLoading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <FlipCounterCard
            label="Global amount"
            :value="discoveredSites.length"
            :active="true"
            accent="#7c3aed"
            shadow-color="#7c3aed"
            tone="rgba(124,58,237,0.08)"
            :loading="statsLoading"
          />
          <FlipCounterCard
            label="Products listed"
            :value="statsLoading ? productsLoaded : productsListed"
            :active="true"
            accent="#f59e0b"
            tone="rgba(245,158,11,0.08)"
            :loading="statsLoading"
          />
        </div>

        <p v-if="statsError" class="mt-3 text-xs text-red-500">{{ statsError }}</p>
      </div>

      <h2 class="text-center text-2xl font-black sm:text-3xl">How it works</h2>
      <p class="mx-auto mt-2 max-w-3xl text-center text-sm" :style="{ color: 'var(--muted)' }">
        Three practical steps to launch a sovereign storefront on Nostr.
      </p>

      <div class="mt-6 space-y-4">
        <article class="overflow-hidden rounded-2xl border md:grid md:grid-cols-2" :style="{ borderColor: 'var(--line)', background: 'var(--bg-soft)' }">
          <div class="md:h-full" :style="{ background: 'color-mix(in oklab, var(--bg) 95%, var(--text) 5%)' }">
            <img src="/1.png" alt="Step 1" class="block h-24 w-full object-cover md:h-full lg:h-64">
          </div>
          <div class="p-5">
            <p class="text-xs font-extrabold uppercase tracking-[0.1em]" :style="{ color: 'var(--brand)' }">Step 1</p>
            <h3 class="mt-2 text-lg font-black">The key is your identity</h3>
            <p class="mt-2 text-sm" :style="{ color: 'var(--muted)' }">
              Your Nostr keypair is your account and ownership layer - simple, portable, and merchant-owned.
            </p>
            <p class="mt-2 text-sm" :style="{ color: 'var(--muted)' }">
              Decentralized products, merchant-owned identity, no platform lock-in.
            </p>
          </div>
        </article>

        <article class="overflow-hidden rounded-2xl border md:grid md:grid-cols-2" :style="{ borderColor: 'var(--line)', background: 'var(--bg-soft)' }">
          <div class="order-0 md:order-2 md:h-full" :style="{ background: 'color-mix(in oklab, var(--bg) 95%, var(--text) 5%)' }">
            <img src="/3.png" alt="Step 2" class="block h-24 w-full object-cover md:h-full lg:h-64">
          </div>
          <div class="order-1 p-5 md:order-1">
            <p class="text-xs font-extrabold uppercase tracking-[0.1em]" :style="{ color: 'var(--brand)' }">Step 2</p>
            <h3 class="mt-2 text-lg font-black">Clone your storefront and choose checkout</h3>
            <p class="mt-2 text-sm" :style="{ color: 'var(--muted)' }">
              Clone a storefront and start accepting Bitcoin payments, or enable a simple PayPal checkout.
            </p>
            <p class="mt-2 text-sm" :style="{ color: 'var(--muted)' }">
              Your site is addressable through Nostr and uses Blossom servers for storage.
            </p>
            <p class="mt-2 text-sm" :style="{ color: 'var(--muted)' }">
              Publish your site manifest to multiple relays for reach and redundancy.
            </p>
          </div>
        </article>

        <article class="overflow-hidden rounded-2xl border md:grid md:grid-cols-2" :style="{ borderColor: 'var(--line)', background: 'var(--bg-soft)' }">
          <div class="md:h-full" :style="{ background: 'color-mix(in oklab, var(--bg) 95%, var(--text) 5%)' }">
            <img src="/4.png" alt="Step 3" class="block h-24 w-full object-cover md:h-full lg:h-64">
          </div>
          <div class="p-5">
            <p class="text-xs font-extrabold uppercase tracking-[0.1em]" :style="{ color: 'var(--brand)' }">Step 3</p>
            <h3 class="mt-2 text-lg font-black">Operate across gateways and clients</h3>
            <p class="mt-2 text-sm" :style="{ color: 'var(--muted)' }">
              Your storefront and merchant portal stay accessible through multiple gateways.
            </p>
            <p class="mt-2 text-sm" :style="{ color: 'var(--muted)' }">
              Accessible via Nostr Gateways <code>npub*.nsite.cloud</code>, <code>npub*.nsite.lol</code>, and <code>npub*.nsite.run</code>.
            </p>
            <p class="mt-2 text-sm" :style="{ color: 'var(--muted)' }">
              Maintain products through interoperable Nostr clients, with the freedom to switch tools anytime.
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <a
                href="https://plebeian.market"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-bold"
                :style="{ borderColor: 'var(--line)' }"
              >
                Plebeian.market
              </a>
              <a
                href="https://shopstr.store"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-bold"
                :style="{ borderColor: 'var(--line)' }"
              >
                shopstr.store
              </a>
              <a
                href="https://conduit.market"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-bold"
                :style="{ borderColor: 'var(--line)' }"
              >
                conduit.market
              </a>
            </div>
          </div>
        </article>
      </div>
    </div>

  </section>
</template>
