/* Marrowby Manor settings.
   Uses the same free Supabase project as Play Caller (it adds its own mm_* tables; run supabase.sql once).
   Both values are safe to publish: the database rules in supabase.sql decide what anyone can do.
   Leave them empty to run in local test mode (one device, multiple tabs). */
window.MYSTERY_CONFIG = {
  supabaseUrl: 'https://ozbbrlawqgkoaviocmbf.supabase.co',
  supabaseKey: 'sb_publishable_tcsiAHanF6-QDBKal5WmTg_mKFXDN6Y',

  // Optional: YouTube links to your filmed scenes (unlisted is fine). You can also paste these
  // on the board's lobby screen under "Your filmed scenes" without editing this file.
  videos: {
    intro: '',
    reveal_A: '',
    reveal_B: '',
    reveal_C: '',
  },
};
