export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Starting server initialization...');
    
    try {
      // Import MongoDB connection and utils dynamically to avoid webpack bundling for client
      const { connectMongo } = await import('./lib/db/mongo');
      const { getErrorMessage } = await import('./lib/utils');
      
      // Connect to MongoDB
      await connectMongo();
      console.log('[Instrumentation] MongoDB connected successfully');

      console.log('[Instrumentation] Registering cron jobs...');
      const { startActionsCron } = await import('./lib/cron/actions');
      startActionsCron();
      console.log('[Instrumentation] Cron jobs registered successfully');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[Instrumentation] Initialization failed:', errorMessage);
    }
  }
}
