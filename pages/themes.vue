<script setup>
import themesData from '~/data/themes.json'

const {
  defaultRelays,
  fetchSourceManifest,
  publishClonedManifestWithExtension
} = useNsiteClone()

useSeoMeta({
  title: 'Themes | Nostr Boutique',
  description: 'Clone-ready nsite themes loaded from a local JSON file.'
})

const defaultThemeImage = 'https://raw.githubusercontent.com/S7NC/Gamma-Napp/master/public/screenshot.png'
const sourceNpub = 'npub1000000k94d2xgnfdyqkvvgmc4x2d798y67k2llk4szq7jarqhz2s540a03'

const THEME_SCREENSHOTS = {
  'store-front': [
    '/store-front/1.png',
    '/store-front/3.png',
    '/store-front/4.png',
    '/store-front/6.png',
    '/store-front/8.png',
    '/store-front/9.png',
    '/store-front/10.png',
    '/store-front/11.png',
    '/store-front/12.png'
  ],
  'fiat-store-front': [
    '/fiat-front/1.png',
    '/fiat-front/2.png',
    '/fiat-front/3.png',
    '/fiat-front/4.png',
    '/fiat-front/6.png',
    '/fiat-front/8.png',
    '/fiat-front/9.png',
    '/fiat-front/10.png',
    '/fiat-front/12.png'
  ],
  'merchant-portal': [
    '/merchant-portal/1.png',
    '/merchant-portal/2.png',
    '/merchant-portal/3.png',
    '/merchant-portal/4.png'
  ]
}

const themes = computed(() => {
  if (!Array.isArray(themesData)) return []
  return themesData
})

const busyByTheme = ref({})
const errorByTheme = ref({})
const successByTheme = ref({})
const selectedImageByTheme = ref({})
const previewImage = ref('')
const previewTitle = ref('')

const themeKey = (theme) => theme.id || `${theme.npub}-${theme.d || 'root'}`

const shortNpub = (npub = '') => {
  if (!npub || npub.length <= 24) return npub
  return `${npub.slice(0, 16)}...${npub.slice(-8)}`
}

const themeScreenshots = (theme) => {
  return THEME_SCREENSHOTS[theme.id] || []
}

const activeThemeImage = (theme) => {
  const key = themeKey(theme)
  return selectedImageByTheme.value[key] || theme.image || themeScreenshots(theme)[0] || defaultThemeImage
}

const setActiveThemeImage = (theme, image) => {
  const key = themeKey(theme)
  selectedImageByTheme.value = {
    ...selectedImageByTheme.value,
    [key]: image
  }
}

const cycleThemeImage = (theme, direction = 1) => {
  const shots = themeScreenshots(theme)
  if (shots.length <= 1) return

  const current = activeThemeImage(theme)
  const currentIndex = shots.indexOf(current)
  const safeIndex = currentIndex >= 0 ? currentIndex : 0
  const nextIndex = (safeIndex + direction + shots.length) % shots.length
  setActiveThemeImage(theme, shots[nextIndex])
}

const openPreview = (theme, image) => {
  previewImage.value = image
  previewTitle.value = theme.title || 'Theme preview'

  if (process.client) {
    document.body.style.overflow = 'hidden'
  }
}

const closePreview = () => {
  previewImage.value = ''
  previewTitle.value = ''

  if (process.client) {
    document.body.style.overflow = ''
  }
}

const handlePreviewKeydown = (event) => {
  if (event.key === 'Escape' && previewImage.value) {
    closePreview()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handlePreviewKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handlePreviewKeydown)
  document.body.style.overflow = ''
})

const toGatewayUrls = (theme) => {
  const npub = theme.npub
  return {
    cloud: `https://${npub}.nsite.cloud/`,
    run: `https://${npub}.nsite.run/`,
    lol: `https://${npub}.nsite.lol/`,
    boutique: `https://${npub}.nsite.boutique/`,
    nostoRe: `https://${npub}.nosto.re/`,
    sovBiz: `https://${npub}.sov.biz/`,
    sovPub: `https://${npub}.sov.pub/`
  }
}

const setBusy = (key, value) => {
  busyByTheme.value = {
    ...busyByTheme.value,
    [key]: value
  }
}

const setError = (key, value) => {
  errorByTheme.value = {
    ...errorByTheme.value,
    [key]: value
  }
}

const setSuccess = (key, value) => {
  successByTheme.value = {
    ...successByTheme.value,
    [key]: value
  }
}

const cloneTheme = async (theme) => {
  const key = themeKey(theme)
  setError(key, '')
  setSuccess(key, '')

  if (!process.client || !window.nostr || typeof window.nostr.getPublicKey !== 'function' || typeof window.nostr.signEvent !== 'function') {
    setError(key, 'Browser signer extension required (NIP-07).')
    return
  }

  setBusy(key, true)
  const pendingWindow = window.open('', '_blank')

  try {
    const sourceAs = theme.sourceAs || theme.cloneAs || 'root'
    const sourceD = theme.sourceD || theme.d || ''
    const deployAs = theme.cloneAs || 'root'
    const deployD = theme.d || ''

    const source = await fetchSourceManifest({
      sourceNpub: theme.npub,
      relays: defaultRelays,
      siteType: sourceAs === 'named' ? 'named' : 'root',
      namedSiteKey: sourceAs === 'named' ? sourceD : ''
    })

    const publishRelays = source.manifestRelays.length > 0 ? source.manifestRelays : defaultRelays

    const result = await publishClonedManifestWithExtension({
      sourceManifest: source.manifest,
      sourcePubkey: source.sourcePubkey,
      relays: publishRelays,
      cloneAs: deployAs === 'named' ? 'named' : 'root',
      namedSiteKey: deployAs === 'named' ? deployD : ''
    })

    const url = `https://${result.npub}.nsite.cloud/`
    setSuccess(key, url)

    if (pendingWindow) {
      pendingWindow.location.href = url
    } else {
      const opened = window.open(url, '_blank', 'noopener,noreferrer')
      if (!opened) setError(key, 'Clone published, but your browser blocked opening a new tab.')
    }
  } catch (error) {
    if (pendingWindow && !pendingWindow.closed) pendingWindow.close()
    setError(key, error.message || 'Could not clone this theme with your signer.')
  } finally {
    setBusy(key, false)
  }
}

const cloneModeLabel = (theme) => {
  const sourceAs = theme.sourceAs || theme.cloneAs || 'root'
  const deployAs = theme.cloneAs || 'root'

  if (sourceAs === deployAs) return deployAs === 'named' ? 'Named clone' : 'Root clone'
  return `${sourceAs === 'named' ? 'Named source' : 'Root source'} -> ${deployAs === 'named' ? 'Named deploy' : 'Root deploy'}`
}

const themeFamilyLabel = (theme) => {
  return theme.id === 'merchant-portal' ? 'Merchant Portal' : 'Store Front'
}
</script>

<template>
  <section class="fade-in-up">
    <div class="surface-card p-6 sm:p-8">
      <h1 class="text-3xl font-black sm:text-4xl">Themes</h1>
      <p class="mt-3 max-w-4xl text-sm sm:text-base" :style="{ color: 'var(--muted)' }">
        They are not really themes, but that is the closest analogy to something you probably already know. This is more of a storefront and merchant portal setup.
        You can deploy a storefront and manage it with any other Nostr-compatible client. You can also deploy the merchant portal, but that part is optional because of Nostr interoperability.
        For storefronts, you have two options: a Bitcoin-maxi Store Front, or a Store Front with a simple PayPal integration. By default, PayPal checkout adds 10% to the end total.
      </p>
      <p class="mt-2 text-xs" :style="{ color: 'var(--muted)' }">
        <strong>Publisher:</strong> <code :title="sourceNpub">{{ shortNpub(sourceNpub) }}</code>
      </p>
    </div>
  </section>

  <section class="mt-6">
    <div v-if="themes.length === 0" class="border px-4 py-3 text-sm" :style="{ borderColor: 'var(--line)' }">
      No themes listed yet.
    </div>

    <div v-else class="space-y-5">
      <article v-for="theme in themes" :key="themeKey(theme)" class="surface-card p-4 sm:p-5">
        <div class="grid gap-4 md:grid-cols-[1.35fr_1fr] md:items-start">
          <div>
            <div class="relative mb-3">
              <button
                type="button"
                class="block w-full overflow-hidden border text-left transition hover:opacity-95"
                :style="{ borderColor: 'var(--line)' }"
                :aria-label="`Open large preview for ${theme.title || 'theme'}`"
                @click="openPreview(theme, activeThemeImage(theme))"
              >
                <img
                  :src="activeThemeImage(theme)"
                  :alt="`${theme.title || 'Theme'} preview`"
                  class="h-72 w-full object-cover sm:h-80"
                  loading="lazy"
                >
              </button>

              <button
                v-if="themeScreenshots(theme).length > 1"
                type="button"
                class="absolute left-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border text-xl font-bold backdrop-blur"
                :style="{ borderColor: 'var(--line)', background: 'rgba(15,23,42,0.6)', color: '#fff' }"
                :aria-label="`Previous ${theme.title || 'theme'} image`"
                @click="cycleThemeImage(theme, -1)"
              >
                ‹
              </button>

              <button
                v-if="themeScreenshots(theme).length > 1"
                type="button"
                class="absolute right-2 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center border text-xl font-bold backdrop-blur"
                :style="{ borderColor: 'var(--line)', background: 'rgba(15,23,42,0.6)', color: '#fff' }"
                :aria-label="`Next ${theme.title || 'theme'} image`"
                @click="cycleThemeImage(theme, 1)"
              >
                ›
              </button>
            </div>

            <div v-if="themeScreenshots(theme).length > 1" class="grid grid-cols-5 gap-2 sm:grid-cols-6">
              <button
                v-for="shot in themeScreenshots(theme)"
                :key="`${themeKey(theme)}-${shot}`"
                type="button"
                class="overflow-hidden border"
                :style="activeThemeImage(theme) === shot ? { borderColor: '#8b5cf6' } : { borderColor: 'var(--line)' }"
                @click="setActiveThemeImage(theme, shot)"
              >
                <img
                  :src="shot"
                  :alt="`${theme.title || 'Theme'} screenshot`"
                  class="h-14 w-full object-cover"
                  loading="lazy"
                >
              </button>
            </div>
          </div>

          <div>
            <p class="text-xs font-bold uppercase tracking-[0.08em]" :style="{ color: 'var(--muted)' }">
              {{ themeFamilyLabel(theme) }}
            </p>
            <h2 class="mt-2 text-2xl font-black">{{ theme.title || 'Untitled theme' }}</h2>
            <p v-if="theme.description" class="mt-2 text-sm" :style="{ color: 'var(--muted)' }">{{ theme.description }}</p>

            <p
              class="mt-3 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs"
              :style="{ color: 'var(--muted)' }"
              :title="theme.npub"
            >
              <strong>Publisher:</strong> {{ shortNpub(theme.npub) }}
            </p>
            <p class="mt-1 text-xs" :style="{ color: 'var(--muted)' }">
              <strong>Publishing:</strong> {{ cloneModeLabel(theme) }}
            </p>

            <p class="mt-4 text-xs font-bold uppercase tracking-[0.08em]" :style="{ color: 'var(--muted)' }">
              Visit Nsite:
            </p>

            <div class="mt-2 flex items-center gap-2">
              <a
                :href="toGatewayUrls(theme).cloud"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg"
                :style="{ borderColor: 'var(--line)' }"
                aria-label="Open template via nsite.cloud"
                title="Open template via nsite.cloud"
              >
                ⛅️
              </a>
              <a
                :href="toGatewayUrls(theme).run"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg"
                :style="{ borderColor: 'var(--line)' }"
                aria-label="Open template via nsite.run"
                title="Open template via nsite.run"
              >
                🏃
              </a>
              <a
                :href="toGatewayUrls(theme).lol"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg"
                :style="{ borderColor: 'var(--line)' }"
                aria-label="Open template via nsite.lol"
                title="Open template via nsite.lol"
              >
                😂
              </a>
              <a
                :href="toGatewayUrls(theme).boutique"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg"
                :style="{ borderColor: 'var(--line)' }"
                aria-label="Open template via nsite.boutique"
                title="Open template via nsite.boutique"
              >
                🛍️
              </a>
              <a
                :href="toGatewayUrls(theme).nostoRe"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg"
                :style="{ borderColor: 'var(--line)' }"
                aria-label="Open template via nosto.re"
                title="Open template via nosto.re"
              >
                🍌
              </a>
              <a
                :href="toGatewayUrls(theme).sovBiz"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg"
                :style="{ borderColor: 'var(--line)' }"
                aria-label="Open template via sov.biz"
                title="Open template via sov.biz"
              >
                🏴‍☠️
              </a>
              <a
                :href="toGatewayUrls(theme).sovPub"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg"
                :style="{ borderColor: 'var(--line)' }"
                aria-label="Open template via sov.pub"
                title="Open template via sov.pub"
              >
                🍻
              </a>
            </div>

            <button
              type="button"
              class="mt-5 inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-xs font-black uppercase tracking-[0.08em] transition disabled:opacity-60"
              :style="{ borderColor: '#8b5cf6', background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)', color: '#fff' }"
              :disabled="busyByTheme[themeKey(theme)]"
              @click="cloneTheme(theme)"
            >
              {{ busyByTheme[themeKey(theme)] ? 'Cloning...' : 'Clone this Nsite' }}
            </button>

            <p v-if="errorByTheme[themeKey(theme)]" class="mt-3 text-xs text-red-500">{{ errorByTheme[themeKey(theme)] }}</p>
            <a
              v-if="successByTheme[themeKey(theme)]"
              :href="successByTheme[themeKey(theme)]"
              target="_blank"
              rel="noopener noreferrer"
              class="mt-3 inline-block text-xs underline"
            >
              {{ successByTheme[themeKey(theme)] }}
            </a>

            <p class="mt-2 text-xs" :style="{ color: 'var(--muted)' }">
              Requires browser extension signer.
            </p>
          </div>
        </div>
      </article>
    </div>
  </section>

  <Teleport to="body">
    <div
      v-if="previewImage"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 sm:p-6"
      @click="closePreview"
    >
      <div class="relative w-full max-w-6xl" @click.stop>
        <button
          type="button"
          class="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border text-xl font-bold backdrop-blur"
          :style="{ borderColor: 'rgba(255,255,255,0.35)', background: 'rgba(15,23,42,0.65)', color: '#fff' }"
          aria-label="Close preview"
          @click="closePreview"
        >
          x
        </button>

        <img
          :src="previewImage"
          :alt="previewTitle"
          class="max-h-[85vh] w-full object-contain shadow-2xl"
        >
      </div>
    </div>
  </Teleport>
</template>
