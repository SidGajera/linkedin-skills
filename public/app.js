// LinkedIn Skills Studio - Client Application

let allSkills = [];
let allHooks = [];
let isFoldExpanded = false;

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initPostStudio();
  initHumanizer();
  initCommentsDrafter();
  initSkillsCatalog();
  initDiagnostics();
});

// Toast notification helper
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// -----------------------------------------------------------------
// Tabs Navigation
// -----------------------------------------------------------------
function initTabs() {
  const navButtons = document.querySelectorAll(".nav-item");
  const tabPanes = document.querySelectorAll(".tab-pane");

  const pageHeadings = {
    "tab-studio": {
      title: "LinkedIn Post Studio & Live Feed Preview",
      sub: "Compose high-reach posts, enforce the 140-char fold, and eliminate robotic AI writing."
    },
    "tab-humanizer": {
      title: "Anti-AI Tell Auditor & Rewriter (V3 2026)",
      sub: "Scans posts and comments for vocabulary density, reveal bridges, fake vulnerability, and em dashes."
    },
    "tab-comments": {
      title: "Value-First Comment & Reply Drafter",
      sub: "Enforces NLP depth rules, new keyword introduction, and 2-level threaded reply flattening."
    },
    "tab-skills": {
      title: "12 LinkedIn Agent Skills Catalog",
      sub: "Full inventory of autonomous marketing skills built for Claude Code, Codex, and agent systems."
    },
    "tab-diagnostics": {
      title: "System Diagnostics & Credentials",
      sub: "Verify offline test suite, schema contracts, and optionally configure Apify, Publora, or Pixfaro."
    }
  };

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.getAttribute("data-tab");

      navButtons.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById(targetTab);
      if (targetPane) targetPane.classList.add("active");

      // Update Header Text
      if (pageHeadings[targetTab]) {
        document.getElementById("page-heading").textContent = pageHeadings[targetTab].title;
        document.getElementById("page-subheading").textContent = pageHeadings[targetTab].sub;
      }
    });
  });

  // Top bar quick selftest button
  document.getElementById("btn-quick-selftest").addEventListener("click", () => {
    document.getElementById("nav-btn-diagnostics").click();
    document.getElementById("btn-run-terminal-selftest").click();
  });
}

// -----------------------------------------------------------------
// Tab 1: Post Studio & Live LinkedIn Card Mockup
// -----------------------------------------------------------------
function initPostStudio() {
  const editor = document.getElementById("post-editor");
  const postContent = document.getElementById("li-post-content");
  const statChars = document.getElementById("stat-chars");
  const statWords = document.getElementById("stat-words");
  const statFold = document.getElementById("stat-fold");
  const foldDot = document.getElementById("fold-dot");
  const hookSelect = document.getElementById("hook-select");
  const hookBanner = document.getElementById("hook-banner");
  const hookBannerTitle = document.getElementById("hook-banner-title");
  const hookBannerDesc = document.getElementById("hook-banner-desc");

  // Load Hook Formulas
  fetch("/api/hooks")
    .then(r => r.json())
    .then(hooks => {
      allHooks = hooks;
      hookSelect.innerHTML = '<option value="">— Select a Canonical Hook —</option>';
      hooks.forEach(h => {
        const opt = document.createElement("option");
        opt.value = h.id;
        opt.textContent = `${h.id}: ${h.name}`;
        hookSelect.appendChild(opt);
      });
    })
    .catch(err => console.error("Error loading hooks:", err));

  // Hook Selection Change
  hookSelect.addEventListener("change", (e) => {
    const selected = allHooks.find(h => h.id === e.target.value);
    if (selected) {
      hookBannerTitle.textContent = selected.title;
      hookBannerDesc.textContent = selected.summary;
      hookBanner.style.display = "flex";
    } else {
      hookBanner.style.display = "none";
    }
  });

  document.getElementById("btn-close-hook-banner").addEventListener("click", () => {
    hookBanner.style.display = "none";
  });

  // Insert Hook Skeleton
  document.getElementById("btn-insert-hook").addEventListener("click", () => {
    const selected = allHooks.find(h => h.id === hookSelect.value);
    if (!selected) {
      showToast("Please select a hook formula first");
      return;
    }
    const template = selected.skeleton || `${selected.name}\n\n[Add your concrete data point or observation here...]`;
    if (editor.value.trim()) {
      editor.value = `${template}\n\n${editor.value}`;
    } else {
      editor.value = template;
    }
    renderPreview();
    showToast(`Inserted ${selected.id} template!`);
  });

  // Live Rendering Logic
  function renderPreview() {
    const raw = editor.value;
    const charCount = raw.length;
    const words = raw.trim() ? raw.trim().split(/\s+/).length : 0;

    statChars.textContent = charCount;
    statWords.textContent = words;

    // Character Limit Indicators
    const charPill = document.getElementById("pill-char-count");
    if (charCount > 3000) {
      charPill.style.borderColor = "var(--accent-rose)";
      charPill.style.color = "var(--accent-rose)";
    } else if (charCount > 2400) {
      charPill.style.borderColor = "var(--accent-amber)";
      charPill.style.color = "var(--accent-amber)";
    } else {
      charPill.style.borderColor = "var(--border-subtle)";
      charPill.style.color = "var(--text-secondary)";
    }

    // Fold Calculation (140 chars is desktop fold limit)
    const foldCutoff = 140;
    if (charCount <= foldCutoff) {
      statFold.textContent = `Fold: Safe (${charCount}/${foldCutoff})`;
      foldDot.className = "fold-dot ok";
    } else {
      statFold.textContent = `Fold: Truncated (${charCount}/${foldCutoff})`;
      foldDot.className = "fold-dot warn";
    }

    if (!raw.trim()) {
      postContent.innerHTML = `<p class="li-placeholder-text">Your formatted LinkedIn post will render here live as you type. Watch where the "...see more" cutoff lands to hook mobile and desktop readers.</p>`;
      return;
    }

    // Handle Truncation View in Feed Card
    if (charCount > foldCutoff && !isFoldExpanded) {
      const truncated = raw.slice(0, foldCutoff);
      postContent.innerHTML = `${escapeHtml(truncated)}<span class="li-see-more-toggle" id="btn-see-more">...see more</span>`;
      document.getElementById("btn-see-more")?.addEventListener("click", () => {
        isFoldExpanded = true;
        renderPreview();
      });
    } else {
      postContent.innerHTML = `${escapeHtml(raw)}${charCount > foldCutoff ? ' <span class="li-see-more-toggle" id="btn-see-less">(see less)</span>' : ''}`;
      document.getElementById("btn-see-less")?.addEventListener("click", () => {
        isFoldExpanded = false;
        renderPreview();
      });
    }
  }

  editor.addEventListener("input", renderPreview);

  // Spacing Formatter (Clean single blank line between paragraphs)
  document.getElementById("btn-format-spacing").addEventListener("click", () => {
    let text = editor.value;
    text = text.replace(/\n{3,}/g, "\n\n").trim();
    editor.value = text;
    renderPreview();
    showToast("Normalized line spacing!");
  });

  // Send to Humanizer Bridge
  document.getElementById("btn-send-to-humanizer").addEventListener("click", () => {
    const text = editor.value;
    if (!text.trim()) {
      showToast("Write or paste a draft first!");
      return;
    }
    document.getElementById("humanizer-input").value = text;
    document.getElementById("nav-btn-humanizer").click();
    document.getElementById("btn-run-audit").click();
  });

  // Copy Post
  document.getElementById("btn-copy-post").addEventListener("click", () => {
    if (!editor.value.trim()) return;
    navigator.clipboard.writeText(editor.value).then(() => {
      showToast("Post copied to clipboard!");
    });
  });

  // Default seed draft for demo
  editor.value = `Most founders think the LinkedIn algorithm wants more content.\n\nIn reality, it penalizes 40% of reach when your draft contains robotic AI markers or outbound links in the body.\n\nHere are 3 rules we validated across 1,000+ posts:\n1. Put the payoff in the first 140 chars before the fold.\n2. One concrete metric in line 1 lifts likes by 34%.\n3. Zero sycophancy in comments.\n\nWhich of these are you testing this week?`;
  renderPreview();
}

// -----------------------------------------------------------------
// Tab 2: AI Tell Humanizer
// -----------------------------------------------------------------
function initHumanizer() {
  const input = document.getElementById("humanizer-input");
  const output = document.getElementById("humanized-output");
  const btnAudit = document.getElementById("btn-run-audit");
  const btnSample = document.getElementById("btn-load-sample-ai");
  const tbody = document.getElementById("issues-tbody");

  btnSample.addEventListener("click", () => {
    input.value = `In today's fast-paced world, navigating the complex AI landscape requires a seamless approach. It is not just about tools, it's about a fundamental paradigm shift.\n\nWe must delve into the intricate tapestry of modern technology to unlock true potential. Crucially, leveraging our robust insights will foster unprecedented growth.\n\nThe result? Short. Punchy. Done. Let that sink in.\n\nWhat do you think?`;
    showToast("Loaded sample post packed with AI tells!");
  });

  btnAudit.addEventListener("click", () => {
    const text = input.value;
    if (!text.trim()) {
      showToast("Please enter or paste text to audit.");
      return;
    }

    btnAudit.disabled = true;
    btnAudit.innerHTML = "<span>⏳ Scanning...</span>";

    fetch("/api/humanize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    })
      .then(r => r.json())
      .then(res => {
        btnAudit.disabled = false;
        btnAudit.innerHTML = "<span>🛡️ Run AI Audit &amp; Scrub</span>";

        // Update Metrics
        document.getElementById("metric-rating").textContent = res.rating;
        document.getElementById("metric-score-text").textContent = `Authenticity Score: ${res.score}/100`;
        document.getElementById("metric-issues-count").textContent = res.issues.length;
        document.getElementById("metric-em-dashes").textContent = `${res.stats.em_dashes} (${res.stats.em_dashes > 2 ? 'High' : 'Normal'})`;
        document.getElementById("metric-words").textContent = res.stats.words;
        document.getElementById("metric-paragraphs").textContent = res.stats.paragraphs;

        // Render Clean Output
        output.textContent = res.humanized;

        // Populate Issues Table
        document.getElementById("issues-badge").textContent = `${res.issues.length} items flagged`;
        tbody.innerHTML = "";

        if (res.issues.length === 0) {
          tbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--accent-emerald);">🎉 No AI tells or cliches detected! The draft reads with authentic human voice.</td></tr>`;
        } else {
          res.issues.forEach(issue => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td><span class="badge ${issue.severity === 'high' ? 'badge-danger' : 'badge-warning'}">${issue.type}</span></td>
              <td><strong class="marker-highlight">${escapeHtml(issue.marker)}</strong></td>
              <td>${escapeHtml(issue.reason)}</td>
              <td><span class="marker-replaced">${escapeHtml(issue.suggestion)}</span></td>
            `;
            tbody.appendChild(tr);
          });
        }
        showToast("Audit & Scrub complete!");
      })
      .catch(err => {
        btnAudit.disabled = false;
        btnAudit.innerHTML = "<span>🛡️ Run AI Audit &amp; Scrub</span>";
        console.error("Audit error:", err);
        showToast("Failed to run audit.");
      });
  });

  // Copy Clean Humanized Draft
  document.getElementById("btn-copy-humanized").addEventListener("click", () => {
    const text = output.textContent;
    if (!text || text.startsWith("Click")) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast("Clean draft copied to clipboard!");
    });
  });
}

// -----------------------------------------------------------------
// Tab 3: Comment & Reply Drafter
// -----------------------------------------------------------------
function initCommentsDrafter() {
  const parentText = document.getElementById("comment-parent-text");
  const commentType = document.getElementById("comment-type");
  const commentReaction = document.getElementById("comment-reaction");
  const insight = document.getElementById("comment-key-insight");
  const outputBox = document.getElementById("comment-output-box");
  const charPill = document.getElementById("comment-char-pill");

  document.getElementById("btn-load-sample-comment").addEventListener("click", () => {
    parentText.value = "Why most B2B founders fail on LinkedIn in 2026: They post broad motivational quotes instead of specific operational playbooks with balance sheet numbers.";
    insight.value = "When we tested breakdown posts with real churn numbers, comment depth tripled within 2 hours.";
    showToast("Loaded sample parent post!");
  });

  document.getElementById("btn-generate-comment").addEventListener("click", () => {
    const parent = parentText.value.trim();
    const userInsight = insight.value.trim();
    const type = commentType.value;
    const reaction = commentReaction.value;

    if (!parent) {
      showToast("Please provide the parent post content.");
      return;
    }

    let comment = "";
    if (userInsight) {
      comment = `${userInsight}\n\nThe differentiator isn't posting volume.. it's whether an operator can screenshot one specific number and apply it today.\n\nAre you tracking comment depth or pure impressions as the primary KPI?`;
    } else {
      comment = `The gap usually comes down to specificity over platitudes.\n\nIn our tests across 45 founder accounts, adding one concrete metric to the opening doubled second-degree reach.\n\nWhat's the benchmark metric you're using to score post depth?`;
    }

    outputBox.textContent = comment;
    const charLen = comment.length;
    charPill.textContent = `${charLen} / 350 chars`;
    if (charLen >= 200 && charLen <= 350) {
      charPill.className = "badge badge-success";
    } else {
      charPill.className = "badge badge-warning";
    }

    showToast("Value-first comment drafted!");
  });

  document.getElementById("btn-copy-comment").addEventListener("click", () => {
    const text = outputBox.textContent;
    if (!text || text.startsWith("Fill in")) return;
    navigator.clipboard.writeText(text).then(() => {
      showToast("Comment copied!");
    });
  });

  // Verify with Humanizer
  document.getElementById("btn-humanize-comment").addEventListener("click", () => {
    const text = outputBox.textContent;
    if (!text || text.startsWith("Fill in")) return;
    document.getElementById("humanizer-input").value = text;
    document.getElementById("nav-btn-humanizer").click();
    document.getElementById("btn-run-audit").click();
  });
}

// -----------------------------------------------------------------
// Tab 4: 12 Skills Catalog
// -----------------------------------------------------------------
function initSkillsCatalog() {
  const grid = document.getElementById("skills-grid");
  const searchInput = document.getElementById("skill-search");
  const filterPills = document.querySelectorAll(".filter-pill");

  fetch("/api/skills")
    .then(r => r.json())
    .then(skills => {
      allSkills = skills;
      renderSkills("All", "");
    })
    .catch(err => {
      grid.innerHTML = `<div class="error-msg">Error loading skills: ${err}</div>`;
    });

  let currentCategory = "All";

  filterPills.forEach(pill => {
    pill.addEventListener("click", () => {
      filterPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      currentCategory = pill.getAttribute("data-category");
      renderSkills(currentCategory, searchInput.value);
    });
  });

  searchInput.addEventListener("input", (e) => {
    renderSkills(currentCategory, e.target.value);
  });

  function renderSkills(category, search) {
    grid.innerHTML = "";
    const filtered = allSkills.filter(s => {
      const matchCat = category === "All" || s.category === category;
      const query = search.toLowerCase();
      const matchSearch = s.name.toLowerCase().includes(query) || s.description.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="text-muted" style="grid-column: 1 / -1; padding: 2rem; text-align: center;">No matching skills found for "${search}".</div>`;
      return;
    }

    filtered.forEach(skill => {
      const card = document.createElement("div");
      card.className = "skill-card card";
      card.innerHTML = `
        <div>
          <div class="skill-card-top">
            <span class="skill-name">${escapeHtml(skill.name)}</span>
            <span class="badge badge-accent">${skill.category}</span>
          </div>
          <p class="skill-desc">${escapeHtml(skill.description)}</p>
        </div>
        <div class="skill-actions">
          <button class="btn btn-outline btn-xs btn-copy-invocation" data-name="${skill.name}">Copy Agent Command</button>
          <a href="https://github.com/SidGajera/linkedin-skills/blob/main/${skill.path}" target="_blank" class="btn btn-secondary btn-xs">View SKILL.md</a>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.querySelectorAll(".btn-copy-invocation").forEach(btn => {
      btn.addEventListener("click", () => {
        const name = btn.getAttribute("data-name");
        navigator.clipboard.writeText(`/${name}`).then(() => {
          showToast(`Copied agent command "/${name}"`);
        });
      });
    });
  }
}

// -----------------------------------------------------------------
// Tab 5: System Diagnostics & Credentials
// -----------------------------------------------------------------
function initDiagnostics() {
  const terminal = document.getElementById("terminal-output");
  const btnRunTest = document.getElementById("btn-run-terminal-selftest");
  const testLabel = document.getElementById("run-test-label");

  // Fetch status
  function fetchStatus() {
    fetch("/api/status")
      .then(r => r.json())
      .then(status => {
        updateCredBadge("status-tag-apify", status.credentials.APIFY_TOKEN);
        updateCredBadge("status-tag-publora", status.credentials.PUBLORA_API_KEY);
        updateCredBadge("status-tag-linkedin-id", status.credentials.LINKEDIN_PLATFORM_ID);
        updateCredBadge("status-tag-pixfaro", status.credentials.PIXFARO_TOKEN);
      })
      .catch(err => console.error("Status check failed:", err));
  }

  function updateCredBadge(id, isConnected) {
    const el = document.getElementById(id);
    if (!el) return;
    if (isConnected) {
      el.textContent = "Connected";
      el.className = "cred-status-tag connected";
    } else {
      el.textContent = "Offline (Draft Only)";
      el.className = "cred-status-tag offline";
    }
  }

  fetchStatus();

  // Run Self-Test
  btnRunTest.addEventListener("click", () => {
    btnRunTest.disabled = true;
    testLabel.textContent = "⏳ Running Suite...";
    terminal.textContent = "Spawning python scripts/selftest.py...\nRunning offline test suite, schema contracts, and credential checks...\n";

    fetch("/api/selftest", { method: "POST" })
      .then(r => r.json())
      .then(res => {
        btnRunTest.disabled = false;
        testLabel.textContent = "▶ Run Self-Test Now";
        terminal.textContent = res.output;
        showToast(res.exit_code === 0 ? "All tests passed successfully!" : "Self-test finished with warnings");
        fetchStatus();
      })
      .catch(err => {
        btnRunTest.disabled = false;
        testLabel.textContent = "▶ Run Self-Test Now";
        terminal.textContent = `Execution failed: ${err}`;
      });
  });

  // Save Credentials to .env
  document.getElementById("btn-save-credentials").addEventListener("click", () => {
    const payload = {};
    const apify = document.getElementById("cred-apify").value.trim();
    const publora = document.getElementById("cred-publora").value.trim();
    const liId = document.getElementById("cred-linkedin-id").value.trim();
    const pixfaro = document.getElementById("cred-pixfaro").value.trim();

    if (apify) payload.APIFY_TOKEN = apify;
    if (publora) payload.PUBLORA_API_KEY = publora;
    if (liId) payload.LINKEDIN_PLATFORM_ID = liId;
    if (pixfaro) payload.PIXFARO_TOKEN = pixfaro;

    if (Object.keys(payload).length === 0) {
      showToast("No credentials entered to save.");
      return;
    }

    fetch("/api/save-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(r => r.json())
      .then(() => {
        showToast("Saved credentials to .env!");
        fetchStatus();
      })
      .catch(err => {
        console.error("Save error:", err);
        showToast("Failed to save credentials.");
      });
  });
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
