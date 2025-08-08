/**
 * @fileoverview This is the main Genkit definitional file.
 */

import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This is the primary instance of Genkit that we will use throughout the app.
// We are using the Google AI plugin.
// The plugin is configured with the API key from the environment variables.
export const ai = genkit({
  plugins: [googleAI()],
});
