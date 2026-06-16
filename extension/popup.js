// popup.js - TubeRank Extension Popup Logic

// Tab Switching Setup
const tabKeyword = document.getElementById("tab-keyword");
const tabTitle = document.getElementById("tab-title");
const panelKeyword = document.getElementById("panel-keyword");
const panelTitle = document.getElementById("panel-title");

tabKeyword.addEventListener("click", () => switchTab("keyword"));
tabTitle.addEventListener("click", () => switchTab("title"));

function switchTab(tab) {
  if (tab === "keyword") {
    tabKeyword.classList.add("active");
    tabTitle.classList.remove("active");
    panelKeyword.classList.add("active");
    panelTitle.classList.remove("active");
  } else {
    tabTitle.classList.add("active");
    tabKeyword.classList.remove("active");
    panelTitle.classList.add("active");
    panelKeyword.classList.remove("active");
  }
}

// Check session on popup initialization
chrome.storage.local.get(["session_error"], (data) => {
  if (data.session_error) {
    showSessionError(data.session_error);
  }
});

// Real-time listener for session expiration messages
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "session_expired") {
    showSessionError(request.message);
  }
});

function showSessionError(msg) {
  const banner = document.getElementById("session-error-banner");
  banner.innerHTML = `${msg} <br><a href="http://localhost:3000/login" target="_blank">Sign In Now</a>`;
  banner.style.display = "block";

  // Disable inputs and buttons
  document.getElementById("keyword-submit-btn").disabled = true;
  document.getElementById("title-submit-btn").disabled = true;
  document.getElementById("keyword-input").disabled = true;
  document.getElementById("title-topic-input").disabled = true;
  document.getElementById("title-keywords-input").disabled = true;
}

// ----------------------------------------------------------------
// KEYWORD SEARCH SUBMIT
// ----------------------------------------------------------------
const keywordForm = document.getElementById("keyword-form");
const keywordResult = document.getElementById("keyword-result");

keywordForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const q = document.getElementById("keyword-input").value.trim();
  if (!q) return;

  // Render skeletons
  keywordResult.style.display = "block";
  keywordResult.innerHTML = `
    <div class="tuberank-pulse-skeleton" style="height: 24px; width: 60%;"></div>
    <div class="tuberank-pulse-skeleton" style="height: 12px; width: 80%;"></div>
    <div class="tuberank-pulse-skeleton" style="height: 12px; width: 50%;"></div>
  `;

  chrome.runtime.sendMessage(
    {
      action: "authenticated_fetch",
      endpoint: `/api/keywords/search?q=${encodeURIComponent(q)}`,
      options: { method: "GET" },
    },
    (response) => {
      if (!response.success) {
        keywordResult.innerHTML = `<span style="color: #ef4444;">Error: ${response.error || "Failed to search keyword."}</span>`;
        return;
      }

      const results = response.data.data;
      const suggestionsHtml = (results.suggestions || []).map(s => `
        <li>
          <span>${s.keyword}</span>
          <span class="val">${s.volume.toLocaleString()}</span>
        </li>
      `).join("");

      keywordResult.innerHTML = `
        <div class="keyword-vol">${results.volume.toLocaleString()} <span style="font-size: 11px; font-weight: normal; color: #94a3b8;">est. searches</span></div>
        <div style="font-size: 11px; color: #94a3b8; font-weight: bold; text-transform: uppercase; margin-bottom: 8px;">Related queries</div>
        <ul class="keyword-list">${suggestionsHtml || "<li>No suggestions found.</li>"}</ul>
      `;
    }
  );
});

// ----------------------------------------------------------------
// TITLE GENERATION SUBMIT
// ----------------------------------------------------------------
const titleForm = document.getElementById("title-form");
const titleResult = document.getElementById("title-result");

titleForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const topic = document.getElementById("title-topic-input").value.trim();
  const keywords = document.getElementById("title-keywords-input").value.trim();
  if (!topic) return;

  // Render skeletons
  titleResult.style.display = "block";
  titleResult.innerHTML = `
    <div class="tuberank-pulse-skeleton" style="height: 16px; width: 90%;"></div>
    <div class="tuberank-pulse-skeleton" style="height: 12px; width: 70%; margin-bottom: 20px;"></div>
    <div class="tuberank-pulse-skeleton" style="height: 16px; width: 85%;"></div>
    <div class="tuberank-pulse-skeleton" style="height: 12px; width: 60%;"></div>
  `;

  chrome.runtime.sendMessage(
    {
      action: "authenticated_fetch",
      endpoint: "/api/ai/title-generator",
      options: {
        method: "POST",
        body: JSON.stringify({ topic, keywords }),
      },
    },
    (response) => {
      if (!response.success) {
        titleResult.innerHTML = `<span style="color: #ef4444;">Error: ${response.error || "Failed to start title generator."}</span>`;
        return;
      }

      const { jobId, state, result } = response.data.data;
      if (state === "completed") {
        renderTitles(result.titles);
      } else {
        pollTitleJob(jobId);
      }
    }
  );
});

function pollTitleJob(jobId) {
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
          titleResult.innerHTML = `<span style="color: #ef4444;">Error: ${response.error || "Error checking job status."}</span>`;
          return;
        }

        const { state, result, reason } = response.data.data;
        if (state === "completed") {
          clearInterval(interval);
          renderTitles(result.titles);
        } else if (state === "failed") {
          clearInterval(interval);
          titleResult.innerHTML = `<span style="color: #ef4444;">Error: ${reason || "Job failed on worker."}</span>`;
        }
      }
    );
  }, 2000);
}

function renderTitles(titles) {
  const itemsHtml = (titles || []).map(t => `
    <div class="title-item">
      <div class="title-text">${t.title}</div>
      <div class="title-rationale">${t.rationale}</div>
    </div>
  `).join("");

  titleResult.innerHTML = itemsHtml || `<span style="color: #94a3b8;">No titles generated.</span>`;
}
