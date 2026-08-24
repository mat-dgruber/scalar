import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as downloadHelper from '../../../helpers/download'
import * as specCompressionHelper from '../../../helpers/spec-compression'
import ApiReferenceToolbarShareLocal from './ApiReferenceToolbarShareLocal.vue'

const mockToast = vi.fn()
vi.mock('@scalar/use-toasts', () => ({
  useToasts: () => ({
    toast: mockToast,
  }),
}))

const mockCopyToClipboard = vi.fn()
vi.mock('@scalar/use-hooks/useClipboard', () => ({
  useClipboard: () => ({
    copyToClipboard: mockCopyToClipboard,
  }),
}))

describe('ApiReferenceToolbarShareLocal', () => {
  const dummySpec = JSON.stringify({ openapi: '3.1.0', info: { title: 'Test API' } })

  const createMockWorkspace = (spec: string | undefined = dummySpec) =>
    ({
      exportActiveDocument: vi.fn().mockReturnValue(spec),
    }) as any

  beforeEach(() => {
    vi.clearAllMocks()

    Object.defineProperty(document, 'execCommand', {
      value: vi.fn().mockReturnValue(true),
      writable: true,
      configurable: true,
    })
  })

  it('renders download and copy buttons', () => {
    const wrapper = mount(ApiReferenceToolbarShareLocal, {
      props: {
        workspace: createMockWorkspace(),
      },
    })

    expect(wrapper.text()).toContain('JSON')
    expect(wrapper.text()).toContain('YAML')
    expect(wrapper.text()).toContain('Copy')
    expect(wrapper.text()).toContain('Generate Preview Link')
  })

  it('handles JSON download when clicked', async () => {
    const downloadSpy = vi.spyOn(downloadHelper, 'downloadDocument').mockResolvedValue(undefined)
    const workspace = createMockWorkspace()

    const wrapper = mount(ApiReferenceToolbarShareLocal, {
      props: { workspace },
    })

    const buttons = wrapper.findAll('button')
    const jsonButton = buttons.find((b) => b.text().includes('JSON'))
    expect(jsonButton?.exists()).toBe(true)

    await jsonButton?.trigger('click')

    expect(workspace.exportActiveDocument).toHaveBeenCalledWith('json')
    expect(downloadSpy).toHaveBeenCalledWith(dummySpec, 'openapi', 'json')
  })

  it('handles YAML download when clicked', async () => {
    const downloadSpy = vi.spyOn(downloadHelper, 'downloadDocument').mockResolvedValue(undefined)
    const workspace = createMockWorkspace()

    const wrapper = mount(ApiReferenceToolbarShareLocal, {
      props: { workspace },
    })

    const buttons = wrapper.findAll('button')
    const yamlButton = buttons.find((b) => b.text().includes('YAML'))
    expect(yamlButton?.exists()).toBe(true)

    await yamlButton?.trigger('click')

    expect(workspace.exportActiveDocument).toHaveBeenCalledWith('json')
    expect(downloadSpy).toHaveBeenCalledWith(dummySpec, 'openapi', 'yaml')
  })

  it('handles copy spec to clipboard', async () => {
    const workspace = createMockWorkspace()

    const wrapper = mount(ApiReferenceToolbarShareLocal, {
      props: { workspace },
    })

    const buttons = wrapper.findAll('button')
    const copyButton = buttons.find((b) => b.text().includes('Copy'))
    expect(copyButton?.exists()).toBe(true)

    await copyButton?.trigger('click')

    expect(workspace.exportActiveDocument).toHaveBeenCalledWith('json')
    expect(mockCopyToClipboard).toHaveBeenCalledWith(dummySpec)
    expect(mockToast).toHaveBeenCalledWith('OpenAPI specification copied to clipboard', 'info')
  })

  it('generates preview url and displays input', async () => {
    const mockUrl = 'http://localhost:5052/#spec:mockcompresseddata'
    vi.spyOn(specCompressionHelper, 'generateSpecHashUrl').mockResolvedValue(mockUrl)
    const workspace = createMockWorkspace()

    const wrapper = mount(ApiReferenceToolbarShareLocal, {
      props: { workspace },
    })

    const buttons = wrapper.findAll('button')
    const generateButton = buttons.find((b) => b.text().includes('Generate Preview Link'))
    expect(generateButton?.exists()).toBe(true)

    await generateButton?.trigger('click')
    await wrapper.vm.$nextTick()

    expect(specCompressionHelper.generateSpecHashUrl).toHaveBeenCalledWith(dummySpec)
    expect(mockToast).toHaveBeenCalledWith('Preview link generated', 'info')
  })
})
