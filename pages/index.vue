<script setup>
import { Shader, SimplexNoise } from 'shaders/vue'

</script>

<template>
  <div>
    <header>

    </header>
    <main class="text-center bg-purple-200">
      <Hero heading="Welcome to Nuxtstack" />
      <Shader class="h-64 overflow-hidden rounded-4xl max-w-7xl mx-auto">
        <SimplexNoise colorA="#3c0366" colorB="#a477fd" :scale="1.5" :balance="0.8" :contrast="0.5" :speed="0.25" />
      </Shader>
      <hr class="my-20 border-white" />
      <NostrComponentsArticles
          :tag-filter="['nostr']"
          :show-author="true"
          :show-topics="false"
          :limit="10"
          grid-cols="md:grid-cols-2 xl:grid-cols-3"
      />
    </main>
    <Footer />
  </div>
</template>