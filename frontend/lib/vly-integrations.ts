// VLY Integrations Configuration
// See /integrations.md for usage documentation

import { createVlyIntegrations } from '@vly-ai/integrations';

const token = typeof process !== 'undefined' && process.env?.VLY_INTEGRATION_KEY
  ? process.env.VLY_INTEGRATION_KEY
  : ((import.meta as any).env?.VITE_VLY_INTEGRATION_KEY || '');

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development'
  ? true
  : ((import.meta as any).env?.DEV ?? false);

export const vly = createVlyIntegrations({
  deploymentToken: token,
  debug: isDev
});
