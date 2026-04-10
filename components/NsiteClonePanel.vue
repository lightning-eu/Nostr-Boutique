<script setup>
const {
  defaultSourceNpub,
  defaultRelays,
  generateIdentity,
  fetchSourceManifest,
  publishProfile,
  publishClonedManifest,
  publishClonedManifestWithExtension
} = useNsiteClone()

const route = useRoute()
const { theme } = useThemeMode()
const PORTAL_SITE_KEY = 'portal'

const sourceNpub = computed(() => {
  const queryNpub = typeof route.query.source === 'string' ? route.query.source.trim() : ''
  return queryNpub || defaultSourceNpub
})

const isLightMode = computed(() => theme.value === 'light')

const fieldStyle = computed(() => {
  if (isLightMode.value) {
    return {
      borderColor: '#a78bfa',
      background: '#faf7ff',
      color: '#111111'
    }
  }

  return {
    borderColor: '#7c3aed',
    background: 'rgba(14,10,28,0.8)',
    color: '#ffffff'
  }
})

const iconButtonStyle = computed(() => {
  if (isLightMode.value) {
    return {
      borderColor: '#a78bfa',
      background: '#faf7ff',
      color: '#111111'
    }
  }

  return {
    borderColor: '#7c3aed',
    background: 'rgba(14,10,28,0.8)',
    color: '#ffffff'
  }
})

const deployButtonStyle = computed(() => {
  return {
    borderColor: '#8b5cf6',
    background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)',
    color: '#ffffff'
  }
})

const canNewcomerDeploy = computed(() => {
  return !newcomerBusy.value && newcomerName.value.trim().length > 0 && newcomerConfirmed.value
})

const existingBusy = ref(false)
const existingError = ref('')
const existingSuccessUrl = ref('')
const existingPortalUrl = ref('')

const newcomerName = ref('')
const newcomerIdentity = ref(null)
const newcomerConfirmed = ref(false)
const newcomerBusy = ref(false)
const newcomerError = ref('')
const newcomerSuccessUrl = ref('')
const newcomerPortalUrl = ref('')

onMounted(() => {
  if (!newcomerIdentity.value) generateNewcomerKeys()
})

const copyText = async (value) => {
  if (!process.client || !value) return
  await navigator.clipboard.writeText(value)
}

const copyNsecAndConfirm = async () => {
  if (!newcomerIdentity.value?.nsec) return
  try {
    await copyText(newcomerIdentity.value.nsec)
    newcomerConfirmed.value = true
  } catch {
    newcomerError.value = 'Could not copy key automatically. Please copy it manually and confirm.'
  }
}

const attemptStoreKeyOnDeploy = async ({ name, nsec }) => {
  if (!process.client) return
  if (!name || !nsec) return
  if (!window.isSecureContext) return
  if (!('PasswordCredential' in window) || !navigator.credentials?.store) return

  try {
    const credential = new window.PasswordCredential({
      id: name,
      name,
      password: nsec
    })
    await navigator.credentials.store(credential)
  } catch {
    // Best effort only. Deploy flow continues even if browser declines.
  }
}

const resetStatus = () => {
  existingError.value = ''
  existingSuccessUrl.value = ''
  existingPortalUrl.value = ''
  newcomerError.value = ''
  newcomerSuccessUrl.value = ''
  newcomerPortalUrl.value = ''
}

const mergeRelays = (relays) => {
  return Array.from(new Set((relays || []).filter(Boolean)))
}

const fetchStorefrontAndPortalSources = async () => {
  const rootSource = await fetchSourceManifest({
    sourceNpub: sourceNpub.value,
    relays: defaultRelays,
    siteType: 'root'
  })

  const portalSource = await fetchSourceManifest({
    sourceNpub: sourceNpub.value,
    relays: defaultRelays,
    siteType: 'named',
    namedSiteKey: PORTAL_SITE_KEY
  })

  const publishRelays = mergeRelays([
    ...defaultRelays,
    ...rootSource.manifestRelays,
    ...portalSource.manifestRelays
  ])

  return {
    rootSource,
    portalSource,
    publishRelays
  }
}

const runExistingFlow = async () => {
  resetStatus()
  existingBusy.value = true

  try {
    const { rootSource, portalSource, publishRelays } = await fetchStorefrontAndPortalSources()

    const result = await publishClonedManifestWithExtension({
      sourceManifest: rootSource.manifest,
      sourcePubkey: rootSource.sourcePubkey,
      relays: publishRelays,
      cloneAs: 'root'
    })

    await publishClonedManifestWithExtension({
      sourceManifest: portalSource.manifest,
      sourcePubkey: portalSource.sourcePubkey,
      relays: publishRelays,
      cloneAs: 'named',
      namedSiteKey: PORTAL_SITE_KEY
    })

    const siteUrl = `https://${result.npub}.nsite.cloud/`
    const portalUrl = `https://${result.npub}.nsite.lol/${PORTAL_SITE_KEY}`
    existingSuccessUrl.value = siteUrl
    existingPortalUrl.value = portalUrl

    if (process.client) {
      const opened = window.open(siteUrl, '_blank', 'noopener,noreferrer')
      if (!opened) existingError.value = 'Clone published, but your browser blocked opening a new tab.'
    }

  } catch (error) {
    existingError.value = error.message || 'Could not clone with your current signer.'
  } finally {
    existingBusy.value = false
  }
}

const generateNewcomerKeys = () => {
  resetStatus()
  newcomerIdentity.value = generateIdentity()
  newcomerConfirmed.value = false
  newcomerError.value = ''
}

const runNewcomerFlow = async () => {
  newcomerError.value = ''

  if (!newcomerName.value.trim()) {
    newcomerError.value = 'Please enter a display name.'
    return
  }

  if (!newcomerIdentity.value) {
    newcomerError.value = 'Generate your keys first.'
    return
  }

  if (!newcomerConfirmed.value) {
    newcomerError.value = 'Please confirm that you backed up your keys.'
    return
  }

  await attemptStoreKeyOnDeploy({
    name: newcomerName.value.trim(),
    nsec: newcomerIdentity.value.nsec
  })

  newcomerBusy.value = true

  try {
    const { rootSource, portalSource, publishRelays } = await fetchStorefrontAndPortalSources()

    await publishProfile({
      identity: newcomerIdentity.value,
      name: newcomerName.value.trim(),
      relays: publishRelays
    })

    await publishClonedManifest({
      identity: newcomerIdentity.value,
      sourceManifest: rootSource.manifest,
      sourcePubkey: rootSource.sourcePubkey,
      relays: publishRelays,
      cloneAs: 'root'
    })

    await publishClonedManifest({
      identity: newcomerIdentity.value,
      sourceManifest: portalSource.manifest,
      sourcePubkey: portalSource.sourcePubkey,
      relays: publishRelays,
      cloneAs: 'named',
      namedSiteKey: PORTAL_SITE_KEY
    })

    const siteUrl = `https://${newcomerIdentity.value.npub}.nsite.cloud/`
    const portalUrl = `https://${newcomerIdentity.value.npub}.nsite.lol/${PORTAL_SITE_KEY}`
    newcomerSuccessUrl.value = siteUrl
    newcomerPortalUrl.value = portalUrl

    if (process.client) {
      const opened = window.open(siteUrl, '_blank', 'noopener,noreferrer')
      if (!opened) newcomerError.value = 'Clone published, but your browser blocked opening a new tab.'
    }

  } catch (error) {
    newcomerError.value = error.message || 'Failed to publish your profile and clone.'
  } finally {
    newcomerBusy.value = false
  }
}
</script>

<template>
  <div class="mx-auto mt-0 w-full max-w-3xl space-y-5 text-left" :style="{ color: '#fff' }">
    <div class="rounded-2xl border p-4 sm:p-5 lg:mx-auto lg:max-w-[85%]" :style="{ borderColor: 'rgba(167,139,250,0.45)', background: 'rgba(6, 5, 16, 0.69)' }">
      <div>
        <h2 class="text-2xl font-black">Create Store Front</h2>
        <p class="mt-1 text-sm" :style="{ color: 'rgba(255,255,255,0.85)' }">Set your name & store your key</p>
      </div>

      <label class="mt-5 block text-xs font-bold uppercase tracking-[0.08em]" :style="{ color: 'rgba(255,255,255,0.85)' }">Name</label>
      <input
        v-model="newcomerName"
        type="text"
        placeholder="Enter Name"
        name="shop-name"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        class="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
        :style="fieldStyle"
      >

      <label class="mt-4 block text-xs font-bold uppercase tracking-[0.08em]" :style="{ color: 'rgba(255,255,255,0.85)' }">Key (nsec)</label>
      <div class="mt-2 flex items-center gap-2">
        <input
          :value="newcomerIdentity?.nsec || ''"
          type="text"
          name="nsec-key"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="none"
          spellcheck="false"
          readonly
          class="w-full rounded-xl border px-3 py-2.5 text-sm outline-none"
          :style="{ ...fieldStyle, WebkitTextSecurity: 'disc', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }"
        >
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border"
          :style="iconButtonStyle"
          title="Copy nsec"
          aria-label="Copy nsec"
          @click="copyNsecAndConfirm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-xl border"
          :style="iconButtonStyle"
          title="Regenerate key"
          aria-label="Regenerate key"
          @click="generateNewcomerKeys"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.64-6.36" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      </div>

      <label class="mt-4 flex items-center gap-2 text-sm">
        <input v-model="newcomerConfirmed" type="checkbox">
        <span>
          I've copied and
          <NuxtLink to="/explain" class="underline">stored my key safely</NuxtLink>.
        </span>
      </label>

      <button
        class="mt-4 inline-flex w-full items-center justify-center rounded-xl border px-5 py-3 text-base font-black disabled:opacity-70"
        :class="['deploy-primary-btn', { 'deploy-border-snake': canNewcomerDeploy }]"
        :style="deployButtonStyle"
        :disabled="newcomerBusy || !newcomerName.trim() || !newcomerConfirmed"
        @click="runNewcomerFlow"
      >
        {{ newcomerBusy ? 'Deploying...' : 'Deploy my shop' }}
      </button>

      <div v-if="newcomerError" class="mt-4 rounded-xl border px-3 py-2 text-xs text-white" :style="{ borderColor: 'rgba(255,255,255,0.5)', background: '#000' }">{{ newcomerError }}</div>
      <div v-if="newcomerSuccessUrl" class="mt-4 rounded-xl border px-3 py-3 text-xs text-white" :style="{ borderColor: 'rgba(255,255,255,0.5)', background: '#000' }">
        <p class="font-bold">Your new nsites are live.</p>
        <a class="mt-2 inline-block underline" :href="newcomerSuccessUrl" target="_blank" rel="noopener noreferrer">{{ newcomerSuccessUrl }}</a>
        <p class="mt-3">You can visit the merchant portal via:</p>
        <a class="mt-1 inline-block underline" :href="newcomerPortalUrl" target="_blank" rel="noopener noreferrer">{{ newcomerPortalUrl }}</a>
      </div>
    </div>

    <div class="mt-4 text-center text-sm font-black uppercase tracking-[0.14em]" :style="{ color: '#fff' }">
      Or
    </div>

    <div class="mt-4 rounded-2xl border p-4 sm:p-5 lg:mx-auto lg:max-w-[85%]" :style="{ borderColor: 'rgba(167,139,250,0.45)', background: 'rgba(6, 5, 16, 0.69)' }">
      <div>
        <h2 class="text-2xl font-black">I'm already on Nostr!</h2>
        <p class="mt-1 text-sm" :style="{ color: 'rgba(255,255,255,0.82)' }">Use your existing signer key and deploy instantly.</p>
      </div>

      <button
        class="mt-4 inline-flex w-full items-center justify-center rounded-xl border px-5 py-3 text-base font-black disabled:opacity-70"
        :style="deployButtonStyle"
        :disabled="existingBusy || newcomerBusy"
        @click="runExistingFlow"
      >
        {{ existingBusy ? 'Deploying...' : 'Deploy with my key' }}
      </button>

      <div v-if="existingError" class="mt-4 rounded-xl border px-4 py-3 text-sm text-white" :style="{ borderColor: 'rgba(255,255,255,0.5)', background: '#000' }">
        {{ existingError }}
      </div>

      <div v-if="existingSuccessUrl" class="mt-4 rounded-xl border px-4 py-3 text-sm text-white" :style="{ borderColor: 'rgba(255,255,255,0.5)', background: '#000' }">
        <p class="font-bold">Clones published with your key.</p>
        <a class="mt-2 inline-block underline" :href="existingSuccessUrl" target="_blank" rel="noopener noreferrer">{{ existingSuccessUrl }}</a>
        <p class="mt-3 text-xs">You can visit the merchant portal via:</p>
        <a class="mt-1 inline-block text-xs underline" :href="existingPortalUrl" target="_blank" rel="noopener noreferrer">{{ existingPortalUrl }}</a>
      </div>
    </div>
  </div>
</template>
