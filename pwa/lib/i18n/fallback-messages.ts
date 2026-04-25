/** Used when external translations API is unavailable or returns an error. */
export const FALLBACK_TRANSLATION_MESSAGES: Record<string, string> = {
  "nav.dashboard": "Dashboard",
  "nav.pwaCheck": "PWA Check",
  "sidebar.menu": "Menu",
  "sidebar.versionLabel": "App version",
  "sidebar.closeMenu": "Close menu",

  "header.openMenu": "Open menu",
  "header.logout": "Log out",
  "header.loggingOut": "Logging out",
  "header.appTitle": "BEP PWA",

  "home.kicker": "Home",
  "home.title": "You are logged in",
  "home.description": "This page is rendered inside the post-authenticated layout.",

  "login.kicker": "Authentication",
  "login.title": "Login",
  "login.description": "Click login to enter the authenticated section layout.",
  "login.submit": "Login",
  "login.signingIn": "Signing in...",
  "login.errorGeneric": "Unable to login right now. Please try again.",

  "pwaCheck.title": "PWA Verification",
  "pwaCheck.intro":
    "Use this page after a production build to verify installability behavior.",
  "pwaCheck.sw.label": "Service worker status",
  "pwaCheck.sw.checking": "Checking...",
  "pwaCheck.sw.notSupported": "Service worker not supported in this browser.",
  "pwaCheck.sw.notRegistered": "Not registered.",
  "pwaCheck.sw.inactive": "registered (not active yet)",
  "pwaCheck.sw.registered": "Registered: {state}",
  "pwaCheck.sw.error": "Error while checking registration.",
  "pwaCheck.standalone.label": "Standalone mode",
  "pwaCheck.standalone.yes": "Yes (installed)",
  "pwaCheck.standalone.no": "No (browser tab mode)",
  "pwaCheck.userAgent.label": "User agent",
  "pwaCheck.userAgent.unknown": "Unknown",
};
