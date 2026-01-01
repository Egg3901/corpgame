export type AnalyticsEvent = 
  | 'view_corporate_actions'
  | 'view_action_points_tooltip'
  | 'user_registered';

export const trackEvent = (event: AnalyticsEvent, data?: Record<string, unknown>) => {
  try {
    // In a real app, this would send data to Segment, Mixpanel, GA4, etc.
    // For now, we'll log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Analytics] ${event}`, data);
    }
    
    // Example implementation for future:
    // window.analytics?.track(event, data);
  } catch (err: unknown) {
    console.warn('Analytics error:', err);
  }
};
