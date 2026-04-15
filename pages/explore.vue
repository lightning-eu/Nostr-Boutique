<script setup>
const sites = ref([])
const loading = ref(true)
const error = ref('')
const refreshedAt = ref(0)

const { fetchTemplateSites, defaultRelays, sourceNpubs } = useNsiteExplore()

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
    sites.value = await fetchTemplateSites()
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

onMounted(async () => {
  await refreshSites()
})
</script>

<template>
  <section class="fade-in-up">
    <div class="surface-card p-6 sm:p-8">
      <h1 class="hero-title mt-4 text-4xl font-black leading-tight">Explore Nsites using this template path.</h1>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        <button
          class="cta-primary rounded-full px-4 py-2 text-sm font-black"
          :disabled="loading"
          @click="refreshSites"
        >
          {{ loading ? 'Scanning relays...' : 'Refresh discovery' }}
        </button>
        <span class="pill">Last refresh: {{ formatTime(refreshedAt) }}</span>
      </div>

      <p class="mt-4 text-xs" :style="{ color: 'var(--muted)' }">Relays scanned: {{ defaultRelays.join(', ') }}</p>
      <p class="mt-1 break-all text-xs" :style="{ color: 'var(--muted)' }">Template sources: {{ sourceNpubs.join(', ') }}</p>
    </div>
  </section>

  <section class="mt-6">
    <div v-if="loading" class="surface-card flex flex-col items-center gap-4 px-6 py-8 text-center">
      <img
        src="/nostr-ostrich-running.gif"
        alt="Running ostrich while relay scan loads"
        class="h-28 w-auto sm:h-32"
      >
      <div class="space-y-1">
        <p class="text-sm font-black">Scanning relays for related Nsites...</p>
        <p class="text-xs" :style="{ color: 'var(--muted)' }">Checking clone lineage through muse and thief tags.</p>
      </div>
    </div>
    <p v-else-if="error" class="rounded-xl border border-red-300 bg-red-500/10 px-4 py-3 text-sm text-red-300">{{ error }}</p>
    <p v-else-if="sites.length === 0" class="text-sm" :style="{ color: 'var(--muted)' }">
      No related Nsites found right now. Discovery is best-effort and improves as more manifests propagate.
    </p>

    <div v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article v-for="site in sites" :key="site.id" class="surface-card p-5 fade-in-up">
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
