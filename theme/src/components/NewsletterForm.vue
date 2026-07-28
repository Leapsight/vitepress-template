<!--
SPDX-License-Identifier: Apache-2.0

Mailchimp newsletter subscription form. Give it a list's embedded-form
`action` URL (…/subscribe/post?u=…&id=…&f_id=…); everything else is derived.

  <NewsletterForm
    action="https://<dc>.list-manage.com/subscribe/post?u=<u>&id=<id>&f_id=<f>"
    :names="true"
    heading="Stay in the loop"
    blurb="Release notes and deep-dives — monthly, no spam." />

Submits inline via Mailchimp's JSONP endpoint (no page navigation) and shows a
success/error message. Without JavaScript it still works: the plain <form>
POSTs to Mailchimp in a new tab (progressive enhancement). Includes Mailchimp's
bot-honeypot field, derived from the action URL.
-->
<template>
  <div class="nl" :class="`nl--${state}`">
    <h2 v-if="heading" class="nl-heading">{{ heading }}</h2>
    <p v-if="blurb" class="nl-blurb">{{ blurb }}</p>

    <p v-if="state === 'success'" class="nl-msg nl-msg--ok" role="status">{{ message }}</p>

    <form
      v-else
      class="nl-form"
      method="post"
      target="_blank"
      :action="action"
      novalidate
      @submit.prevent="onSubmit"
    >
      <div v-if="names" class="nl-row">
        <input v-model="fname" type="text" name="FNAME" autocomplete="given-name" placeholder="First name" />
        <input v-model="lname" type="text" name="LNAME" autocomplete="family-name" placeholder="Last name" />
      </div>
      <div class="nl-row">
        <input
          v-model="email"
          type="email"
          name="EMAIL"
          autocomplete="email"
          placeholder="Email address"
          required
          aria-label="Email address"
        />
        <button type="submit" class="nl-btn" :disabled="state === 'loading'">
          {{ state === 'loading' ? 'Subscribing…' : cta }}
        </button>
      </div>

      <!-- Mailchimp honeypot: real people leave it empty; bots fill it. -->
      <div class="nl-hp" aria-hidden="true">
        <input v-if="honeypot" v-model="hp" :name="honeypot" type="text" tabindex="-1" autocomplete="off" />
      </div>

      <p v-if="state === 'error'" class="nl-msg nl-msg--err" role="alert">{{ message }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(
  defineProps<{
    action: string
    names?: boolean
    heading?: string
    blurb?: string
    cta?: string
  }>(),
  { names: false, cta: 'Subscribe' }
)

const email = ref('')
const fname = ref('')
const lname = ref('')
const hp = ref('')
const state = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const message = ref('')

// Mailchimp's honeypot field is named b_<u>_<id>, taken from the action URL.
const honeypot = computed(() => {
  try {
    const q = new URL(props.action).searchParams
    const u = q.get('u')
    const id = q.get('id')
    return u && id ? `b_${u}_${id}` : ''
  } catch {
    return ''
  }
})

function stripHtml(s: unknown): string {
  return typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim() : ''
}

function onSubmit() {
  if (state.value === 'loading') return
  state.value = 'loading'
  message.value = ''

  const cb = 'mc_cb_' + Math.random().toString(36).slice(2)
  const url = new URL(props.action.replace('/post', '/post-json'))
  url.searchParams.set('EMAIL', email.value)
  if (props.names) {
    if (fname.value) url.searchParams.set('FNAME', fname.value)
    if (lname.value) url.searchParams.set('LNAME', lname.value)
  }
  if (honeypot.value) url.searchParams.set(honeypot.value, hp.value)
  url.searchParams.set('c', cb)

  const script = document.createElement('script')
  const cleanup = () => {
    delete (window as never)[cb]
    script.remove()
  }
  const timer = setTimeout(() => {
    cleanup()
    state.value = 'error'
    message.value = 'Something went wrong — please try again.'
  }, 10000)

  ;(window as never)[cb] = (data: { result?: string; msg?: string }) => {
    clearTimeout(timer)
    cleanup()
    if (data && data.result === 'success') {
      state.value = 'success'
      message.value = stripHtml(data.msg) || 'Thanks — please check your inbox to confirm.'
    } else {
      state.value = 'error'
      message.value = stripHtml(data && data.msg) || 'Subscription failed — please try again.'
    }
  }
  script.onerror = () => {
    clearTimeout(timer)
    cleanup()
    state.value = 'error'
    message.value = 'Network error — please try again.'
  }
  script.src = url.toString()
  document.body.appendChild(script)
}
</script>

<style scoped>
.nl-heading {
  margin: 0 0 0.4rem;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.nl-blurb {
  margin: 0 0 1.2rem;
  color: var(--vp-c-text-2);
}
.nl-form {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.nl-row {
  display: flex;
  gap: 0.7rem;
}
.nl-row input {
  flex: 1 1 0;
  min-width: 0;
  padding: 0.7rem 0.9rem;
  font: inherit;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  transition: border-color 0.15s;
}
.nl-row input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}
.nl-btn {
  flex: none;
  padding: 0.7rem 1.4rem;
  font: inherit;
  font-weight: 600;
  color: #0a0c10;
  background: var(--vp-c-brand-1);
  border: 0;
  border-radius: 9px;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;
}
.nl-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}
.nl-btn:disabled {
  opacity: 0.6;
  cursor: default;
}
.nl-hp {
  position: absolute;
  left: -5000px;
  height: 0;
  overflow: hidden;
}
.nl-msg {
  margin: 0.2rem 0 0;
  font-size: 0.95rem;
}
.nl-msg--ok {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.nl-msg--err {
  color: var(--vp-c-danger-1, #e05252);
}
@media (max-width: 560px) {
  .nl-row {
    flex-direction: column;
  }
}
</style>
