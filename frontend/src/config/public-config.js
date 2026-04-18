export const PUBLIC_CONFIG = {
  APP_NAME: 'PM Registry App',
  COMPANY_NAME: 'MEC Mechanical Inc.',

  // Replace both values before booting the app.
  SUPABASE_URL: 'https://gcytixguuxluijriosrm.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjeXRpeGd1dXhsdWlqcmlvc3JtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzgyMDgsImV4cCI6MjA5MDI1NDIwOH0.Jb81RCpCE-dYB2b-H6Pw22gxXtggBqhIBjoqVmcSMf8',

  AUTH: {
    redirectTo: window.location.origin,
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
