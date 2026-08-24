import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import ApiReferenceToolbarIntegrate from './ApiReferenceToolbarIntegrate.vue'

describe('ApiReferenceToolbarIntegrate', () => {
  it('renders framework snippets tab with Express selected by default', () => {
    const wrapper = mount(ApiReferenceToolbarIntegrate)

    expect(wrapper.text()).toContain('Framework Snippets')
    expect(wrapper.text()).toContain('Internal Guides & Standards')
    expect(wrapper.text()).toContain('Express')
    expect(wrapper.text()).toContain('Fastify')
    expect(wrapper.text()).toContain('NestJS')
    expect(wrapper.text()).toContain('Hono')
    expect(wrapper.text()).toContain('FastAPI (Python)')
    expect(wrapper.text()).toContain('HTML / CDN')

    expect(wrapper.text()).toContain('@scalar/express-api-reference')
  })

  it('switches framework snippet on pill click', async () => {
    const wrapper = mount(ApiReferenceToolbarIntegrate)

    const buttons = wrapper.findAll('button')
    const fastifyButton = buttons.find((b) => b.text().includes('Fastify'))
    expect(fastifyButton?.exists()).toBe(true)

    await fastifyButton?.trigger('click')
    expect(wrapper.text()).toContain('@scalar/fastify-api-reference')

    const fastapiButton = buttons.find((b) => b.text().includes('FastAPI'))
    await fastapiButton?.trigger('click')
    expect(wrapper.text()).toContain('from fastapi import FastAPI')
  })

  it('switches to internal guides tab', async () => {
    const wrapper = mount(ApiReferenceToolbarIntegrate)

    const buttons = wrapper.findAll('button')
    const guidesTabButton = buttons.find((b) => b.text().includes('Internal Guides & Standards'))
    expect(guidesTabButton?.exists()).toBe(true)

    await guidesTabButton?.trigger('click')

    expect(wrapper.text()).toContain('Guia Padrão OpenAPI & DX')
    expect(wrapper.text()).toContain('Guia de Arquitetura do Fork')
  })
})
