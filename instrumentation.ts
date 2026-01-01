import { connectMongo } from './lib/db/mongo';
import { getErrorMessage } from './lib/utils';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Starting server initialization...');
    
    try {
      // Connect to MongoDB
      await connectMongo();
      console.log('[Instrumentation] MongoDB connected successfully');

      console.log('[Instrumentation] Registering cron jobs...');
      // Import dynamically to avoid loading during build if possible, 
      // though instrumentation runs at runtime.
      const { startActionsCron } = await import('./lib/cron/actions');
      startActionsCron();
      console.log('[Instrumentation] Cron jobs registered successfully');
    } catch (error: unknown) {
      console.error('[Instrumentation] Initialization failed:', getErrorMessage(error));
    }
  }
}
