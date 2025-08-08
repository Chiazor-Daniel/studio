/**
 * @fileoverview This is the Genkit development entry point.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Load the flow from the main file.
import './genkit';

export default genkit({
  plugins: [googleAI()],
  // Log developer-friendly errors
  logLevel: 'debug',
  // Perform OpenTelemetry instrumentation and enable traces locally.
  enableTracingAndMetrics: true,
});
