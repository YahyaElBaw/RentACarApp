<script setup lang="ts">
import { AvatarFallback, type AvatarFallbackProps } from 'radix-vue'
import { cn } from '@/lib/utils'

interface Props extends AvatarFallbackProps {
  class?: string
}

const props = defineProps<Props>()
</script>

<template>
  <AvatarFallback
    v-bind="props"
    :class="
      cn(
        'flex h-full w-full items-center justify-center rounded-full bg-muted font-medium text-muted-foreground',
        props.class,
      )
    "
  >
    <slot />
  </AvatarFallback>
</template>
