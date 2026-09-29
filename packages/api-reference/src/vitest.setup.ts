import {
  consoleErrorSpy,
  consoleWarnSpy,
  disableConsoleError,
  disableConsoleWarn,
  isConsoleErrorEnabled,
  isConsoleWarnEnabled,
  resetConsoleSpies,
} from '@scalar/helpers/testing/console-spies'
import { afterEach, expect, vi } from 'vitest'

import { createPluginManager } from '@/plugins/plugin-manager'

// In-memory localStorage mock for Node 22+ experimental storage environment
let mockStore: Record<string, string> = {}
const mockLocalStorage = {
  getItem: (key: string) => mockStore[key] ?? null,
  setItem: (key: string, value: string) => {
    mockStore[key] = String(value)
  },
  removeItem: (key: string) => {
    delete mockStore[key]
  },
  clear: () => {
    mockStore = {}
  },
  get length() {
    return Object.keys(mockStore).length
  },
  key: (i: number) => Object.keys(mockStore)[i] ?? null,
}

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
})

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
    configurable: true,
  })
}

// Mock usePluginManager
vi.mock('@/plugins/hooks/usePluginManager', () => ({
  usePluginManager: vi.fn(() => createPluginManager({})),
}))

// Mock @scalar/use-toasts to prevent vue-sonner Toaster ref crash under JSDOM
vi.mock('@scalar/use-toasts', () => ({
  ScalarToasts: {
    name: 'ScalarToasts',
    render: () => null,
  },
  useToasts: () => ({
    initializeToasts: vi.fn(),
    toast: vi.fn(),
  }),
}))

afterEach(() => {
  /**
   * Make sure we didn't log any warnings or errors on all tests
   *
   * If you get an error that's something like "ScalarFloating: Target with id="v-0" not found", it means you need to
   * attach the component to the dom in the mount options with `attachTo: document.body`
   *
   * To disable you can call `disableConsoleChecks()` in the test
   *
   * TODO: going to disable these as a lot of our tests have warnings and errors, we can enable them globally as we
   * bring that number down
   */

  if (isConsoleWarnEnabled) {
    expect(consoleWarnSpy).not.toHaveBeenCalled()
  }

  if (isConsoleErrorEnabled) {
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  }

  // Reset the spies
  resetConsoleSpies()
  disableConsoleWarn()
  disableConsoleError()

  vi.clearAllMocks()
})
