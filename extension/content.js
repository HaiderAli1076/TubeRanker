// content.js - TubeRank Content Script for YouTube Watch Pages

let overlayContainer = null;
let currentVideoId = null;

// Helper to extract video ID from URL
function getVideoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("v");
}

// Injects the floating optimizer trigger button into YouTube page
function injectTriggerButton() {
  if (document.getElementById("tuberank-trigger")) return;

  const btn = document.createElement("button");
  btn.id = "tuberank-trigger";
  btn.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
      <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
      <polyline points="2 17 12 22 22 17"></polyline>
      <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
    Optimize Video
  `;

  // Inject styles for floating trigger
  const style = document.createElement("style");
  style.id = "tuberank-styles";
  style.innerHTML = `
    #tuberank-trigger {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 99999;
      background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);
      color: #ffffff;
      border: none;
      border-radius: 9999px;
      padding: 12px 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 10px 25px rgba(99, 102, 241, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      letter-spacing: 0.5px;
    }
    #tuberank-trigger:hover {
      transform: translateY(-3px) scale(1.05);
      box-shadow: 0 15px 30px rgba(99, 102, 241, 0.6);
    }
    #tuberank-trigger:active {
      transform: translateY(-1px) scale(0.98);
    }
    
    /* Overlay Sidebar Style */
    #tuberank-overlay {
      position: fixed;
      top: 0;
      right: -420px;
      width: 400px;
      height: 100vh;
      background: rgba(15, 15, 20, 0.95);
      backdrop-filter: blur(16px);
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
      z-index: 999999;
      transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
    }
    #tuberank-overlay.open {
      right: 0;
    }
    #tuberank-overlay-header {
      padding: 24px;
      border-b: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    #tuberank-overlay-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      background: linear-gradient(to right, #a78bfa, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .tuberank-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 24px;
      cursor: pointer;
      line-height: 1;
    }
    .tuberank-close-btn:hover {
      color: #f1f5f9;
    }
    #tuberank-overlay-content {
      padding: 24px;
      overflow-y: auto;
      flex-1: 1;
    }
    .tuberank-score-circle {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(99,102,241,0.05) 100%);
      border: 3px solid #8b5cf6;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px auto;
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
    }
    .tuberank-score-number {
      font-size: 32px;
      font-weight: 900;
      color: #a78bfa;
      line-height: 1;
    }
    .tuberank-score-label {
      font-size: 10px;
      text-transform: uppercase;
      color: #94a3b8;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    .tuberank-subscore-grid {
      display: grid;
      grid-template-cols: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }
    .tuberank-subscore-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 10px;
      text-align: center;
    }
    .tuberank-subscore-val {
      font-size: 18px;
      font-weight: 800;
      color: #f1f5f9;
    }
    .tuberank-subscore-name {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .tuberank-section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #c084fc;
      margin: 20px 0 10px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      padding-bottom: 4px;
    }
    .tuberank-list {
      padding-left: 16px;
      margin: 0 0 16px 0;
      font-size: 12px;
      line-height: 1.5;
      color: #cbd5e1;
    }
    .tuberank-list li {
      margin-bottom: 6px;
    }
    .tuberank-loading {
      text-align: center;
      padding: 40px 0;
      color: #94a3b8;
    }
    .tuberank-pulse-skeleton {
      animation: pulse 1.5s infinite ease-in-out;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
      margin-bottom: 12px;
    }
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 0.3; }
      100% { opacity: 0.6; }
    }
  `;
  document.head.appendChild(style);

  btn.addEventListener("click", () => toggleOverlay());
  document.body.appendChild(btn);
}

// Toggles overlay sidebar visibility
function toggleOverlay() {
  if (!overlayContainer) {
    createOverlayElement();
  }
  overlayContainer.classList.toggle("open");
  if (overlayContainer.classList.contains("open")) {
    runScorecardAnalysis();
  }
}

// Creates the sidebar overlay container elements
function createOverlayElement() {
  overlayContainer = document.createElement("div");
  overlayContainer.id = "tuberank-overlay";
  overlayContainer.innerHTML = `
    <div id="tuberank-overlay-header">
      <h2>TubeRank Scorecard</h2>
      <button class="tuberank-close-btn">&times;</button>
    </div>
    <div id="tuberank-overlay-content"></div>
  `;

  overlayContainer.querySelector(".tuberank-close-btn").addEventListener("click", () => {
    overlayContainer.classList.remove("open");
  });

  document.body.appendChild(overlayContainer);
}

// Hits /api/scorecard and runs the polling loop to retrieve analysis results
async function runScorecardAnalysis() {
  const videoId = getVideoId();
  if (!videoId) return;

  const content = document.getElementById("tuberank-overlay-content");
  content.innerHTML = `
    <div class="tuberank-loading">
      <div class="tuberank-pulse-skeleton" style="height: 100px; width: 100px; border-radius: 50%; margin: 0 auto 24px auto;"></div>
      <div class="tuberank-pulse-skeleton" style="height: 20px; width: 80%; margin: 0 auto 12px auto;"></div>
      <div class="tuberank-pulse-skeleton" style="height: 12px; width: 60%; margin: 0 auto 30px auto;"></div>
      <p style="font-size: 13px;">Analyzing video metadata...</p>
    </div>
  `;

  // Start the scorecard generation job
  chrome.runtime.sendMessage(
    {
      action: "authenticated_fetch",
      endpoint: "/api/scorecard",
      options: {
        method: "POST",
        body: JSON.stringify({ videoId }),
      },
    },
    (response) => {
      if (!response.success) {
        renderError(response.error || "Failed to start analysis");
        return;
      }

      const { jobId, state, result } = response.data.data;
      if (state === "completed") {
        renderScorecard(result);
      } else {
        pollJob(jobId);
      }
    }
  );
}

// Polls the job status endpoint until success or failure
function pollJob(jobId) {
  const interval = setInterval(() => {
    chrome.runtime.sendMessage(
      {
        action: "authenticated_fetch",
        endpoint: `/api/jobs/${jobId}`,
        options: { method: "GET" },
      },
      (response) => {
        if (!response.success) {
          clearInterval(interval);
          renderError(response.error || "Error during status check");
          return;
        }

        const { state, result, reason } = response.data.data;
        if (state === "completed") {
          clearInterval(interval);
          renderScorecard(result);
        } else if (state === "failed") {
          clearInterval(interval);
          renderError(reason || "Analysis worker failed");
        }
      }
    );
  }, 2000);
}

// Renders the calculated scores and AI lists inside the sidebar
function renderScorecard(data) {
  const content = document.getElementById("tuberank-overlay-content");
  if (!content) return;

  const strengthsList = data.strengths.map(s => `<li>${s}</li>`).join("");
  const weaknessesList = data.weaknesses.map(w => `<li>${w}</li>`).join("");
  const recommendationsList = data.recommendations.map(r => `<li>${r}</li>`).join("");

  content.innerHTML = `
    <div class="tuberank-score-circle">
      <span class="tuberank-score-number">${data.overallScore}</span>
      <span class="tuberank-score-label">Score</span>
    </div>

    <div class="tuberank-subscore-grid">
      <div class="tuberank-subscore-card">
        <div class="tuberank-subscore-val">${data.subscores.title}</div>
        <div class="tuberank-subscore-name">Title</div>
      </div>
      <div class="tuberank-subscore-card">
        <div class="tuberank-subscore-val">${data.subscores.description}</div>
        <div class="tuberank-subscore-name">Description</div>
      </div>
      <div class="tuberank-subscore-card">
        <div class="tuberank-subscore-val">${data.subscores.tags}</div>
        <div class="tuberank-subscore-name">Tags</div>
      </div>
      <div class="tuberank-subscore-card">
        <div class="tuberank-subscore-val">${data.subscores.thumbnail}</div>
        <div class="tuberank-subscore-name">Thumbnail</div>
      </div>
    </div>

    <div class="tuberank-section-title">Strengths</div>
    <ul class="tuberank-list">${strengthsList || "<li>No major strengths detected.</li>"}</ul>

    <div class="tuberank-section-title">Weaknesses</div>
    <ul class="tuberank-list">${weaknessesList || "<li>No major weaknesses detected! Great job.</li>"}</ul>

    <div class="tuberank-section-title">Recommendations</div>
    <ul class="tuberank-list">${recommendationsList || "<li>Everything looks fully optimized!</li>"}</ul>
  `;
}

// Render error message inside the sidebar
function renderError(msg) {
  const content = document.getElementById("tuberank-overlay-content");
  if (!content) return;
  content.innerHTML = `
    <div style="text-align: center; padding: 40px 10px; color: #ef4444;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 12px; display: inline-block;">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h3 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 700;">Analysis Failed</h3>
      <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">${msg}</p>
    </div>
  `;
}

// Initial setup and URL polling because YouTube uses single-page application navigation
function init() {
  injectTriggerButton();
  
  // YouTube uses custom page transition events; track navigation
  setInterval(() => {
    const videoId = getVideoId();
    if (videoId !== currentVideoId) {
      currentVideoId = videoId;
      if (overlayContainer && overlayContainer.classList.contains("open")) {
        runScorecardAnalysis();
      }
    }
  }, 1000);
}

// Kickstart the content script injection
init();
