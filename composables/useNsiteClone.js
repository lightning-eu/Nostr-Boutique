import { SimplePool } from 'nostr-tools/pool'
import { finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools/pure'
import * as nip19 from 'nostr-tools/nip19'

const DEFAULT_SOURCE_NPUB = 'npub1000000k94d2xgnfdyqkvvgmc4x2d798y67k2llk4szq7jarqhz2s540a03'

const DEFAULT_RELAYS = [
  'wss://relay.ditto.pub',
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://nos.lol'
]

const toRelay = (value) => {
  if (typeof value !== 'string') return ''
  const relay = value.trim()
  return relay.startsWith('wss://') ? relay : ''
}

const uniq = (values) => {
  return Array.from(new Set((values || []).map(toRelay).filter(Boolean)))
}

const decodeNpub = (npub) => {
  const decoded = nip19.decode(npub)
  if (decoded.type !== 'npub') throw new Error('Invalid npub format.')
  return decoded.data
}

const parseRelaysFromManifest = (event) => {
  const fromTags = []
  for (const tag of event?.tags || []) {
    if ((tag[0] === 'relay' || tag[0] === 'r') && tag[1]) fromTags.push(tag[1])
  }
  return uniq(fromTags)
}

const stripNamedSiteTags = (tags) => {
  return tags.filter((tag) => tag[0] !== 'd' && tag[0] !== 'name')
}

const stripCloneTrailTags = (tags) => {
  return tags.filter((tag) => !['muse', 'thief', 'source'].includes(tag[0]))
}

const toSiteKey = ({ sourceManifest, namedSiteKey }) => {
  if (namedSiteKey && namedSiteKey.trim()) return namedSiteKey.trim()
  const dTag = (sourceManifest?.tags || []).find((tag) => tag[0] === 'd')
  if (dTag?.[1]) return dTag[1]
  return ''
}

export const buildRootCloneManifestTemplate = ({ sourceManifest, sourcePubkey, relays }) => {
  const baseTags = stripCloneTrailTags(stripNamedSiteTags((sourceManifest?.tags || []).map((tag) => [...tag])))
  const relayTags = uniq([
    ...parseRelaysFromManifest(sourceManifest),
    ...(relays || [])
  ]).map((relay) => ['relay', relay])

  const nonRelayTags = baseTags.filter((tag) => tag[0] !== 'relay' && tag[0] !== 'r')

  return {
    kind: 15128,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ...nonRelayTags,
      ...relayTags,
      ['muse', sourcePubkey, ...uniq(relays || []).slice(0, 3)]
    ],
    content: sourceManifest?.content || ''
  }
}

export const buildNamedCloneManifestTemplate = ({ sourceManifest, sourcePubkey, relays, namedSiteKey = '' }) => {
  const siteKey = toSiteKey({ sourceManifest, namedSiteKey })
  if (!siteKey) throw new Error('Named clone requires a site key (d tag).')

  const cleanedTags = stripCloneTrailTags((sourceManifest?.tags || []).map((tag) => [...tag]))
  const relayTags = uniq([
    ...parseRelaysFromManifest(sourceManifest),
    ...(relays || [])
  ]).map((relay) => ['relay', relay])

  const nonRelayTags = cleanedTags.filter((tag) => !['relay', 'r', 'd', 'name'].includes(tag[0]))

  return {
    kind: 35128,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['d', siteKey],
      ['name', siteKey],
      ...nonRelayTags,
      ...relayTags,
      ['muse', sourcePubkey, ...uniq(relays || []).slice(0, 3)]
    ],
    content: sourceManifest?.content || ''
  }
}

export const buildCloneManifestTemplate = ({
  sourceManifest,
  sourcePubkey,
  relays,
  cloneAs = 'root',
  namedSiteKey = ''
}) => {
  if (cloneAs === 'named') {
    return buildNamedCloneManifestTemplate({
      sourceManifest,
      sourcePubkey,
      relays,
      namedSiteKey
    })
  }

  return buildRootCloneManifestTemplate({
    sourceManifest,
    sourcePubkey,
    relays
  })
}

export const useNsiteClone = () => {
  const pool = new SimplePool()

  const generateIdentity = () => {
    const secretKey = generateSecretKey()
    const pubkey = getPublicKey(secretKey)
    return {
      secretKey,
      pubkey,
      npub: nip19.npubEncode(pubkey),
      nsec: nip19.nsecEncode(secretKey)
    }
  }

  const fetchSourceManifest = async ({
    sourceNpub = DEFAULT_SOURCE_NPUB,
    relays = DEFAULT_RELAYS,
    siteType = 'auto',
    namedSiteKey = ''
  }) => {
    const sourcePubkey = decodeNpub(sourceNpub)

    const filter = {
      kinds: [15128, 35128],
      authors: [sourcePubkey],
      limit: 30
    }

    if (siteType === 'root') filter.kinds = [15128]
    if (siteType === 'named') {
      filter.kinds = [35128]
      if (namedSiteKey && namedSiteKey.trim()) filter['#d'] = [namedSiteKey.trim()]
    }

    const events = await pool.querySync(relays, filter)

    const latest = [...events].sort((a, b) => b.created_at - a.created_at)[0]
    if (!latest) throw new Error('No source nsite manifest found on selected relays.')

    return {
      sourcePubkey,
      manifest: latest,
      manifestRelays: parseRelaysFromManifest(latest)
    }
  }

  const publishProfile = async ({ identity, name, relays }) => {
    const profile = {
      name,
      display_name: name,
      about: 'Owner of a sovereign Nsite webshop'
    }

    const event = finalizeEvent({
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(profile)
    }, identity.secretKey)

    const pubs = pool.publish(relays, event)
    await Promise.any(pubs)
    return event
  }

  const publishClonedManifest = async ({
    identity,
    sourceManifest,
    sourcePubkey,
    relays,
    cloneAs = 'root',
    namedSiteKey = ''
  }) => {
    const template = buildCloneManifestTemplate({
      sourceManifest,
      sourcePubkey,
      relays,
      cloneAs,
      namedSiteKey
    })
    const event = finalizeEvent(template, identity.secretKey)

    const pubs = pool.publish(relays, event)
    await Promise.any(pubs)
    return event
  }

  const publishClonedManifestWithExtension = async ({
    sourceManifest,
    sourcePubkey,
    relays,
    cloneAs = 'root',
    namedSiteKey = ''
  }) => {
    if (!process.client || !window.nostr) {
      throw new Error('No Nostr signer found. Please install a NIP-07 extension.')
    }

    if (typeof window.nostr.getPublicKey !== 'function' || typeof window.nostr.signEvent !== 'function') {
      throw new Error('Connected signer does not support required NIP-07 methods.')
    }

    const pubkey = await window.nostr.getPublicKey()
    const template = buildCloneManifestTemplate({
      sourceManifest,
      sourcePubkey,
      relays,
      cloneAs,
      namedSiteKey
    })
    const unsignedEvent = {
      ...template,
      pubkey
    }

    const signedEvent = await window.nostr.signEvent(unsignedEvent)
    const pubs = pool.publish(relays, signedEvent)
    await Promise.any(pubs)

    return {
      event: signedEvent,
      pubkey,
      npub: nip19.npubEncode(pubkey)
    }
  }

  return {
    defaultSourceNpub: DEFAULT_SOURCE_NPUB,
    defaultRelays: DEFAULT_RELAYS,
    uniq,
    generateIdentity,
    fetchSourceManifest,
    publishProfile,
    publishClonedManifest,
    publishClonedManifestWithExtension
  }
}
