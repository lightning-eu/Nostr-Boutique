<script setup>
const isOpen = ref(false)
const input = ref('')
const pollTimer = ref(null)

const {
  identity,
  messages,
  isSending,
  isSyncing,
  error,
  ensureIdentity,
  startSession,
  syncNewMessages,
  sendMessage,
  clearIdentity,
  targetNpub
} = usePublicChat()

const myPubkey = computed(() => identity.value?.pubkey || '')

const displayMessages = computed(() => {
  const starter = {
    id: 'starter-message',
    content: 'Hey! If you have questions about Nostr Boutique or Nostr, I am happy to answer. It might take up to 5 min!',
    createdAt: null,
    isMine: false
  }

  const published = messages.value.map((event) => ({
    id: event.id,
    content: event.content,
    createdAt: event.created_at,
    isMine: event.pubkey === myPubkey.value
  }))

  return [starter, ...published]
})

const formatTime = (unix) => {
  if (!unix) return ''
  return new Date(unix * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const toggleOpen = async () => {
  isOpen.value = !isOpen.value
  if (!isOpen.value) return
  await startSession()
}

const submit = async () => {
  const body = input.value.trim()
  if (!body || isSending.value) return
  try {
    await sendMessage(body)
    input.value = ''
  } catch {
    // Error state is handled in composable.
  }
}

const onKeydown = async (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    await submit()
  }
}

onMounted(() => {
  ensureIdentity()
})

watch(
  () => isOpen.value,
  (open) => {
    if (!process.client) return
    if (!open) {
      if (pollTimer.value) {
        window.clearInterval(pollTimer.value)
        pollTimer.value = null
      }
      return
    }

    if (pollTimer.value) window.clearInterval(pollTimer.value)
    pollTimer.value = window.setInterval(() => {
      syncNewMessages({ silent: true })
    }, 12000)
  }
)

onBeforeUnmount(() => {
  if (!process.client) return
  if (pollTimer.value) window.clearInterval(pollTimer.value)
})
</script>

<template>
  <div class="pointer-events-none fixed right-4 bottom-4 z-[90] sm:right-6 sm:bottom-6">
    <div class="pointer-events-auto flex flex-col items-end gap-3">
      <div
        v-if="!isOpen"
        class="hint-bubble relative rounded-2xl border px-3 py-1 text-center text-[11px] font-bold"
        :style="{ borderColor: 'var(--line)', background: 'var(--bg-soft)' }"
      >
        Hi 👋, I am Clara.<br>Here to help you get started !
      </div>

      <section
        v-if="isOpen"
        class="chat-shell w-[min(92vw,360px)] border shadow-xl"
        :style="{ borderColor: 'var(--line)', background: 'var(--bg-soft)' }"
      >
        <header class="flex items-center justify-between border-b px-3 py-2" :style="{ borderColor: 'var(--line)' }">
          <div>
            <p class="text-sm font-black">Clara Chat</p>
            <p class="text-[10px]" :style="{ color: 'var(--muted)' }">to {{ targetNpub.slice(0, 14) }}...{{ targetNpub.slice(-8) }}</p>
          </div>
          <button
            type="button"
            class="rounded border px-2 py-1 text-[10px] font-bold"
            :style="{ borderColor: 'var(--line)' }"
            @click="clearIdentity(); ensureIdentity(); if (isOpen) startSession()"
          >
            New key
          </button>
        </header>

        <div class="max-h-72 min-h-44 space-y-2 overflow-y-auto px-3 py-3">
          <p v-if="isSyncing && displayMessages.length <= 1" class="text-[10px] font-bold" :style="{ color: 'var(--muted)' }">
            Checking for replies...
          </p>

          <article
            v-for="message in displayMessages"
            :key="message.id"
            class="w-fit max-w-[86%] rounded px-2.5 py-2 text-xs"
            :class="message.isMine ? 'ml-auto' : 'mr-auto'"
            :style="message.isMine ? { background: 'var(--brand)', color: 'var(--bg)' } : { background: '#e5e7eb', color: '#111827' }"
          >
            <p class="whitespace-pre-wrap break-words">{{ message.content }}</p>
            <p v-if="message.createdAt" class="mt-1 text-[10px] opacity-70">{{ formatTime(message.createdAt) }}</p>
          </article>
        </div>

        <p v-if="error" class="border-t px-3 py-2 text-[11px]" :style="{ borderColor: 'var(--line)', color: '#b91c1c' }">
          {{ error }}
        </p>

        <footer class="border-t p-3" :style="{ borderColor: 'var(--line)' }">
          <textarea
            v-model="input"
            rows="2"
            class="w-full resize-none border px-2 py-1.5 text-xs outline-none"
            :style="{ borderColor: 'var(--line)', background: 'var(--bg-soft)' }"
            placeholder="Write an encrypted message..."
            @keydown="onKeydown"
          />
          <div class="mt-2 flex justify-end">
            <button
              type="button"
              class="rounded px-3 py-1.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              :style="{ background: 'linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)' }"
              :disabled="isSending || !input.trim()"
              @click="submit"
            >
              {{ isSending ? 'Sending...' : 'Send' }}
            </button>
          </div>
        </footer>
      </section>

      <button
        type="button"
        class="avatar-launcher relative h-16 w-16 overflow-hidden rounded-full border-2"
        :style="{ borderColor: isOpen ? '#a855f7' : '#7c3aed' }"
        aria-label="Open Clara chat"
        :aria-expanded="isOpen ? 'true' : 'false'"
        @click="toggleOpen"
      >
        <img src="/clara.png" alt="Clara chat avatar" class="h-full w-full object-cover" />
        <span class="active-dot" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.avatar-launcher {
  box-shadow: 0 0 0 rgba(124, 58, 237, 0.55);
  animation: avatar-pulse 1.8s ease-out infinite;
}

.chat-shell {
  border-radius: 1rem;
  overflow: hidden;
}

.hint-bubble {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.hint-bubble::before {
  content: '';
  position: absolute;
  right: 10px;
  bottom: -8px;
  width: 12px;
  height: 12px;
  background: var(--bg-soft);
  border-right: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  transform: rotate(45deg);
}

.active-dot {
  position: absolute;
  right: 0.35rem;
  bottom: 0.35rem;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
  background: #22c55e;
  border: 2px solid #fff;
  box-shadow: 0 0 0 rgba(34, 197, 94, 0.65);
  animation: dot-ping 1.4s ease-out infinite;
}

@keyframes avatar-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4);
  }

  70% {
    box-shadow: 0 0 0 12px rgba(124, 58, 237, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(124, 58, 237, 0);
  }
}

@keyframes dot-ping {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5);
  }

  75% {
    box-shadow: 0 0 0 7px rgba(34, 197, 94, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .avatar-launcher,
  .active-dot {
    animation: none;
  }
}
</style>
