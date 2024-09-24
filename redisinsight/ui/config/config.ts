import { numberEnv } from './utils'

export const riConfig = {
  workbench: {
    length: numberEnv('RI_WORKBENCH_LENGTH', 111)
  }

  // RI_API_PREFIX: 'api',
  // RI_APP_PORT: '5540',
  // RI_BASE_API_URL: apiUrl,
  // RI_RESOURCES_BASE_URL: apiUrl,
  // RI_PIPELINE_COUNT_DEFAULT: '5',
  // RI_SCAN_COUNT_DEFAULT: '500',
  // RI_SCAN_TREE_COUNT_DEFAULT: '10000',
  // RI_APP_TYPE: process.env.RI_APP_TYPE,
  // RI_CONNECTIONS_TIMEOUT_DEFAULT: 30 * 1000,
  // RI_HOSTED_API_BASE_URL: hostedApiBaseUrl,
  // RI_CSRF_ENDPOINT: process.env.RI_CSRF_ENDPOINT,
}

export type Config = typeof riConfig
export type KeyOfConfig = keyof typeof riConfig
