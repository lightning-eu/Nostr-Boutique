<script setup>
useSeoMeta({
  title: 'Nostr Boutique',
  description: 'Host your own self sovereign shop.'
})
</script>

<template>
  <section class="w-full max-w-3xl text-center">
    <div class="flex justify-center">
      <SiteBrand />
    </div>

    <div class="mx-auto mt-6 max-w-2xl px-5 py-4 text-center">
      <p class="text-sm leading-7 sm:text-base">
        💳 No credit card or monthly fees!<br>
        📵 No email address or phone number!<br>
        ⚡ As close to one-click deploy as possible (no joke).<br>
        🛠️ No technical skills required, but they are always handy.
      </p>
      <p class="mt-3 text-base font-bold sm:text-lg">Get started in less than 15 sec.</p>
    </div>

    <NsiteClonePanel />
  </section>
</template>
