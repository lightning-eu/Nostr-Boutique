<script setup>
const sites = ref([])
const loading = ref(true)
const error = ref('')
const refreshedAt = ref(0)
const displayMode = ref('filtered')
const productsLoaded = ref(0)

const { fetchTemplateSites, defaultRelays, sourceNpubs } = useNsiteExplore()

const imageBackedSites = computed(() => {
  return sites.value.filter((site) => typeof site.profileImage === 'string' && site.profileImage.trim() !== '')
})

const totalClonedBoutiques = computed(() => sites.value.length)
const productsListed = computed(() => {
  return imageBackedSites.value.reduce((total, site) => total + (site.productCount || 0), 0)
})

const displayedSites = computed(() => {
  return displayMode.value === 'all' ? sites.value : imageBackedSites.value
})

useSeoMeta({
  title: 'Explore | Nostr Boutique',
  description: 'Discover Nsites related to this template by scanning relay manifests with clone heuristics.'
})

const formatDate = (unixTimestamp) => {
  const date = new Date(unixTimestamp * 1000)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const refreshSites = async () => {
  try {
    loading.value = true
    error.value = ''
    sites.value = []
    productsLoaded.value = 0
    displayMode.value = 'filtered'
    sites.value = await fetchTemplateSites({
      onProgress: ({ sites: nextSites }) => {
        sites.value = nextSites
        productsLoaded.value = nextSites
          .filter((site) => typeof site.profileImage === 'string' && site.profileImage.trim() !== '')
          .reduce((total, site) => total + (site.productCount || 0), 0)
      }
    })
    productsLoaded.value = productsListed.value
    refreshedAt.value = Math.floor(Date.now() / 1000)
  } catch (err) {
    error.value = err.message || 'Could not load Nsite discovery right now.'
  } finally {
    loading.value = false
  }
}

const formatTime = (unixTimestamp) => {
  if (!unixTimestamp) return 'Not yet'
  return new Date(unixTimestamp * 1000).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatTodayDate = () => {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date()).replace(/\//g, ' / ')
}

onMounted(async () => {
  await refreshSites()
})
</script>

<template>
  <section class="fade-in-up">
    <div class="surface-card p-6 sm:p-8">
      <h1 class="hero-title mt-4 text-4xl font-black leading-tight">Explore already live boutiques</h1>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        <button
          class="cta-primary rounded-full px-4 py-2 text-sm font-black"
          :disabled="loading"
          @click="refreshSites"
        >
          {{ loading ? 'Scanning relays...' : 'Refresh discovery' }}
        </button>
        <span class="pill">Last refresh: {{ formatTime(refreshedAt) }} | Today: {{ formatTodayDate() }}</span>
      </div>

      <div v-if="!error" class="mt-6 grid gap-3 sm:grid-cols-3">
        <FlipCounterCard
          label="Filtered list"
          :value="imageBackedSites.length"
          :active="displayMode === 'filtered'"
          accent="#10b981"
          tone="rgba(16,185,129,0.08)"
          :loading="loading"
          @click="displayMode = 'filtered'"
        />

        <FlipCounterCard
          label="Global amount"
          :value="totalClonedBoutiques"
          :active="displayMode === 'all'"
          accent="#3b82f6"
          shadow-color="#3b82f6"
          tone="rgba(59,130,246,0.08)"
          :loading="loading"
          @click="displayMode = 'all'"
        />

        <FlipCounterCard
          label="Products listed"
          :value="loading ? productsLoaded : productsListed"
          :active="displayMode === 'filtered'"
          accent="#f59e0b"
          tone="rgba(245,158,11,0.08)"
          :loading="loading"
          @click="displayMode = 'filtered'"
        />
      </div>
    </div>
  </section>

  <section class="mt-6">
    <div v-if="loading" class="surface-card mb-3 flex flex-col items-center justify-center gap-1 px-3 py-2 text-center">
      <img
        src="/nostr-ostrich-running.gif"
        alt="Running ostrich while relay scan loads"
        class="h-7 w-auto sm:h-8"
      >
      <p class="text-[11px] font-semibold" :style="{ color: 'var(--muted)' }">
        Fetching boutiques and products
        <span class="inline-flex items-center gap-0.5" aria-hidden="true">
          <span class="h-1 w-1 rounded-full bg-current animate-pulse" />
          <span class="h-1 w-1 rounded-full bg-current animate-pulse [animation-delay:120ms]" />
          <span class="h-1 w-1 rounded-full bg-current animate-pulse [animation-delay:240ms]" />
        </span>
      </p>
      <p class="mt-1 text-[11px]" :style="{ color: 'var(--muted)' }">Relays scanned: {{ defaultRelays.join(', ') }}</p>
      <p class="break-all text-[11px]" :style="{ color: 'var(--muted)' }">Template sources: {{ sourceNpubs.join(', ') }}</p>
    </div>
    <p v-if="error && totalClonedBoutiques === 0" class="rounded-xl border border-red-300 bg-red-500/10 px-4 py-3 text-sm text-red-300">{{ error }}</p>
    <p v-else-if="!loading && totalClonedBoutiques === 0" class="text-sm" :style="{ color: 'var(--muted)' }">
      No related Nsites found right now. Discovery is best-effort and improves as more manifests propagate.
    </p>
    <p v-else-if="!loading && displayMode === 'filtered' && imageBackedSites.length === 0" class="text-sm" :style="{ color: 'var(--muted)' }">
      Cloned boutiques were found, but none of them currently have a profile image set.
    </p>

    <div v-if="displayedSites.length > 0" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="site in displayedSites" :key="site.id" class="surface-card p-5 fade-in-up">
        <div class="mb-3 flex items-center gap-3">
          <img
            v-if="site.profileImage"
            :src="site.profileImage"
            :alt="`${site.profileName} profile image`"
            class="h-10 w-10 rounded-full border object-cover"
            :style="{ borderColor: 'var(--line)' }"
          >

          <div class="min-w-0 flex-1">
            <p class="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-black">{{ site.profileName }}</p>
            <p
              class="block max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs"
              :style="{ color: 'var(--muted)' }"
            >
              {{ site.npubShort }}
            </p>
          </div>
        </div>

        <div class="flex items-start justify-between gap-3">
          <h2 v-if="site.title && site.title !== 'Unnamed Nsite'" class="text-lg font-black">{{ site.title }}</h2>
          <span
            v-if="site.sourceLabel"
            class="inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
            :style="{
              borderColor: site.sourceLabel === 'New' ? 'rgba(16,185,129,0.45)' : 'rgba(245,158,11,0.45)',
              backgroundColor: site.sourceLabel === 'New' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
              color: site.sourceLabel === 'New' ? '#065f46' : '#92400e'
            }"
          >
            {{ site.sourceLabel }}
          </span>
        </div>
        <p class="mt-1 text-xs" :style="{ color: 'var(--muted)' }">Updated {{ formatDate(site.createdAt) }}</p>

        <p class="mt-4 text-xs font-bold uppercase tracking-[0.08em]" :style="{ color: 'var(--muted)' }">
          Visit Nsite:
        </p>

        <div class="mt-4 flex flex-wrap gap-2 text-sm">
          <a
            :href="site.nsiteCloudUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-base"
            :style="{ borderColor: 'var(--line)' }"
            aria-label="Open via nsite.cloud"
            title="Open via nsite.cloud"
          >
            ⛅️
          </a>
          <a
            :href="site.nsiteRunUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-base"
            :style="{ borderColor: 'var(--line)' }"
            aria-label="Open via nsite.run"
            title="Open via nsite.run"
          >
            🏃
          </a>
          <a
            :href="site.nsiteLolUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-base"
            :style="{ borderColor: 'var(--line)' }"
            aria-label="Open via nsite.lol"
            title="Open via nsite.lol"
          >
            😂
          </a>
          <a
            :href="site.nsiteBoutiqueUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-base"
            :style="{ borderColor: 'var(--line)' }"
            aria-label="Open via nsite.boutique"
            title="Open via nsite.boutique"
          >
            🛍️
          </a>
          <a
            :href="site.nostoReUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-base"
            :style="{ borderColor: 'var(--line)' }"
            aria-label="Open via nosto.re"
            title="Open via nosto.re"
          >
            🍌
          </a>
          <a
            :href="site.sovBizUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-base"
            :style="{ borderColor: 'var(--line)' }"
            aria-label="Open via sov.biz"
            title="Open via sov.biz"
          >
            🏴‍☠️
          </a>
          <a
            :href="site.sovPubUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full border text-base"
            :style="{ borderColor: 'var(--line)' }"
            aria-label="Open via sov.pub"
            title="Open via sov.pub"
          >
            🍻
          </a>
        </div>
      </article>
    </div>
  </section>
</template>
