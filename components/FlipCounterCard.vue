<script setup>
import Vue3Odometer from 'vue3-odometer'
import 'odometer/themes/odometer-theme-default.css'

const props = defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: Number,
    default: 0
  },
  active: {
    type: Boolean,
    default: false
  },
  accent: {
    type: String,
    default: '#10b981'
  },
  shadowColor: {
    type: String,
    default: ''
  },
  tone: {
    type: String,
    default: 'rgba(16,185,129,0.08)'
  },
  fullWidth: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click'])

const normalizedValue = computed(() => Math.max(0, Number(props.value) || 0))

const cardStyle = computed(() => {
  const glow = props.shadowColor || props.accent

  return props.active
    ? {
        borderColor: props.accent,
        background: props.tone,
        boxShadow: `0 18px 40px -28px ${glow}`
      }
    : {
        borderColor: 'var(--line)',
        background: props.tone,
        boxShadow: 'none'
      }
})
</script>

<template>
  <button
    type="button"
    class="counter-card group relative overflow-hidden rounded-3xl border px-5 py-5 text-left transition sm:px-6"
    :class="props.fullWidth ? 'sm:col-span-2' : ''"
    :style="cardStyle"
    @click="$emit('click')"
  >
    <div class="absolute inset-x-0 top-0 h-px bg-white/50" />

    <div class="flex items-center justify-between gap-3">
      <p class="text-xs font-bold uppercase tracking-[0.14em]" :style="{ color: 'var(--muted)' }">{{ props.label }}</p>
      <span v-if="props.loading" class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-current opacity-40 animate-pulse" :style="{ color: props.accent }" />
        <span class="h-1.5 w-1.5 rounded-full bg-current opacity-70 animate-pulse [animation-delay:120ms]" :style="{ color: props.accent }" />
        <span class="h-1.5 w-1.5 rounded-full bg-current animate-pulse [animation-delay:240ms]" :style="{ color: props.accent }" />
      </span>
    </div>

    <div class="mt-3 flex justify-center text-5xl font-black leading-none sm:text-6xl">
      <ClientOnly>
        <Vue3Odometer
          class="odometer-counter"
          :value="normalizedValue"
          format="(,ddd)"
          :duration="900"
          theme="default"
        />
        <template #fallback>
          <span>{{ normalizedValue.toLocaleString('en-US') }}</span>
        </template>
      </ClientOnly>
    </div>
  </button>
</template>

<style scoped>
.counter-card:hover {
  transform: translateY(-1px);
}

:deep(.odometer.odometer-auto-theme),
:deep(.odometer.odometer-theme-default) {
  font-family: inherit;
  line-height: 1;
}
</style>
