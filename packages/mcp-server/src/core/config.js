let activeEnvName = 'local'
export function listEnvironments() {
  return {
    local: {
      url: process.env.INTERNAL_API_URL || 'http://localhost:5052',
      token: process.env.INTERNAL_API_TOKEN || 'local-dev-token',
    },
    dev: {
      url: process.env.DEV_API_URL || 'http://localhost:3000',
      token: process.env.DEV_API_TOKEN || '',
    },
    staging: {
      url: process.env.STAGING_API_URL || 'http://localhost:8080',
      token: process.env.STAGING_API_TOKEN || '',
    },
  }
}
export function getConfig() {
  const envs = listEnvironments()
  const current = envs[activeEnvName] || envs.local
  return {
    name: activeEnvName,
    url: current.url,
    token: current.token,
  }
}
export function setEnvironment(env) {
  activeEnvName = env
  return getConfig()
}
