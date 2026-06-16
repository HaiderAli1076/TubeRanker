// background.js - Chrome Extension Service Worker

// Build-time configuration flag
const IS_DEV = false; // Set to false for production deploy
const TUBE_RANK_HOST = IS_DEV ? "http://localhost:3000" : "https://tuberank.com";

/**
 * 1. Fetches a fresh JWT and stores both token and expiresAt in chrome.storage.local
 */
async function refreshExtensionToken() {
  try {
    const response = await fetch(`${TUBE_RANK_HOST}/api/extension/token`, {
      method: "GET",
      credentials: "include", // Pass browser session cookies
    });

    if (!response.ok) {
      if (response.status === 401) {
        await handleSessionExpired();
        throw new Error("SESSION_EXPIRED");
      }
      throw new Error(`Server returned error status: ${response.status}`);
    }

    const json = await response.json();
    if (json.success && json.data) {
      const { token } = json.data;
      
      // Calculate expiresAt local timestamp (exactly 5 minutes from now)
      const expiresAt = Date.now() + 5 * 60 * 1000;
      
      // Save BOTH token and expiresAt to chrome.storage.local
      await chrome.storage.local.set({
        extension_token: { token, expiresAt }
      });
      
      console.log("Token successfully refreshed. Local Expiry:", new Date(expiresAt).toISOString());
      return { token, expiresAt };
    } else {
      throw new Error(json.error?.message || "Token response success claim is false.");
    }
  } catch (error) {
    if (error.message !== "SESSION_EXPIRED") {
      console.error("Failed to refresh extension token:", error.message);
    }
    throw error;
  }
}

/**
 * 3. Handles session expiration: clears storage, stores error, and notifies popup
 */
async function handleSessionExpired() {
  // Clear chrome.storage.local entirely
  await chrome.storage.local.clear();

  const errorMessage = "Session expired. Please sign in at tuberank.com again.";

  // Store the error so that the popup UI reads and displays it upon opening
  await chrome.storage.local.set({
    session_error: errorMessage
  });

  // Attempt to broadcast the expiration to the popup if it is currently open
  chrome.runtime.sendMessage({
    action: "session_expired",
    message: errorMessage
  }).catch(() => {
    // Suppress warning if the popup is closed and no listener is registered
  });

  console.warn("User session expired. Cleared local storage and notified popup.");
}

/**
 * 2. Token Retriever and Refresh Checker
 * Checks if the stored token is missing or within 30 seconds of expiry before proceeding.
 */
async function getValidToken() {
  const data = await chrome.storage.local.get("extension_token");
  const tokenData = data.extension_token;
  
  const now = Date.now();

  // If token is missing, or close to expiry (within 30 seconds threshold), refresh it
  if (!tokenData || now > (tokenData.expiresAt - 30000)) {
    console.log("Token missing or near expiry. Initiating refresh...");
    const refreshed = await refreshExtensionToken();
    return refreshed.token;
  }

  return tokenData.token;
}

/**
 * Check-Before-Call API wrapper used by other parts of the extension
 */
async function authenticatedFetch(endpoint, options = {}) {
  try {
    // Retrieve a guaranteed valid token (throws if session is expired)
    const token = await getValidToken();

    // Attach JWT to authorization headers
    const headers = {
      ...options.headers,
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };

    // Execute original API call
    return await fetch(`${TUBE_RANK_HOST}${endpoint}`, {
      ...options,
      headers
    });
  } catch (error) {
    if (error.message === "SESSION_EXPIRED") {
      console.error("API call aborted: NextAuth session is expired.");
    } else {
      console.error("API call aborted due to error:", error.message);
    }
    throw error; // Do NOT proceed with the original API call
  }
}

// Listener to handle requests from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "authenticated_fetch") {
    authenticatedFetch(request.endpoint, request.options)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          sendResponse({ success: false, error: errData.error?.message || `HTTP ${res.status}` });
          return;
        }
        const data = await res.json();
        sendResponse({ success: true, data });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep message channel open for async response
  }
});
