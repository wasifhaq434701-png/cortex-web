/* ==========================================================================
   Cortex landing page — interactions + GitHub Releases download wiring
   --------------------------------------------------------------------------
   EDIT ONLY THIS CONFIG BLOCK to point downloads at your repo / asset names.
   The site reads the repo's LATEST GitHub Release and matches each OS button
   to a release asset by the regex below — so Tauri's versioned filenames work
   with NO renaming. Publish a Release → the buttons update automatically.
   Until a release exists, every button shows "Coming soon".
   ========================================================================== */
const REPO = "wasifhaq434701-png/Cortex";

// Which release asset belongs to which OS button (matched against the filename).
const ASSET_MATCHERS = {
  windows: /\.(exe|msi)$/i,
  mac_arm: /\.dmg$/i,          // Apple Silicon only (no Intel .dmg shipped)
  linux:   /\.appimage$/i,
};

const RELEASES_URL = `https://github.com/${REPO}/releases`;
const API_LATEST   = `https://api.github.com/repos/${REPO}/releases/latest`;

/* ---------- helpers ---------- */
function humanSize(bytes) {
  if (!bytes) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

function detectOS() {
  const ua = (navigator.userAgent || "").toLowerCase();
  const plat = (navigator.platform || "").toLowerCase();
  if (/win/.test(ua) || /win/.test(plat)) return "windows";
  if (/android/.test(ua)) return "linux";
  if (/mac/.test(ua) || /mac/.test(plat) || /iphone|ipad/.test(ua)) {
    // Best-effort Apple-Silicon guess; both mac cards are shown regardless.
    return "mac_arm";
  }
  if (/linux/.test(ua) || /x11/.test(ua)) return "linux";
  return null;
}

/* ---------- download wiring ---------- */
function setComingSoon(card) {
  const btn = card.querySelector(".dl-btn");
  btn.classList.add("is-disabled");
  btn.setAttribute("aria-disabled", "true");
  btn.href = RELEASES_URL;
  btn.removeAttribute("target");
  btn.querySelector(".dl-label").textContent = "Coming soon";
}

function setDownload(card, asset) {
  const btn = card.querySelector(".dl-btn");
  btn.classList.remove("is-disabled");
  btn.removeAttribute("aria-disabled");
  btn.href = asset.browser_download_url;
  // GitHub serves release assets as attachments — download in place, no new tab,
  // no redirect to the repo.
  btn.removeAttribute("target");
  btn.removeAttribute("rel");
  btn.setAttribute("download", "");
  btn.querySelector(".dl-label").textContent = "Download";
  const note = card.querySelector("[data-note]");
  if (note && asset.size) note.textContent = `${note.dataset.base || note.textContent} · ${humanSize(asset.size)}`;
}

async function wireDownloads() {
  const cards = Array.from(document.querySelectorAll(".dl-card"));
  cards.forEach(c => {
    const note = c.querySelector("[data-note]");
    if (note) note.dataset.base = note.textContent;
  });

  // Highlight the visitor's OS card.
  const os = detectOS();
  if (os) {
    const match = os === "mac_arm" || os === "mac_intel"
      ? document.querySelector('.dl-card[data-os="mac_arm"]')
      : document.querySelector(`.dl-card[data-os="${os}"]`);
    if (match) match.setAttribute("data-detected", "");
  }

  const verBadge = document.getElementById("version-badge");
  const dlVer = document.getElementById("download-version");

  try {
    const res = await fetch(API_LATEST, { headers: { Accept: "application/vnd.github+json" } });
    if (!res.ok) throw new Error(`No release (${res.status})`);
    const rel = await res.json();
    const assets = rel.assets || [];
    const tag = rel.tag_name || rel.name || "latest";
    const date = rel.published_at ? new Date(rel.published_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";

    if (verBadge) verBadge.textContent = `Latest: ${tag}`;
    if (dlVer) dlVer.innerHTML = `Latest release: <strong>${tag}</strong>${date ? ` · ${date}` : ""}`;

    cards.forEach(card => {
      const key = card.getAttribute("data-os");
      const re = ASSET_MATCHERS[key];
      const asset = re ? assets.find(a => re.test(a.name)) : null;
      if (asset) setDownload(card, asset);
      else setComingSoon(card);
    });
  } catch (err) {
    // No release yet, or rate-limited → graceful "Coming soon" everywhere.
    if (verBadge) verBadge.textContent = "Installers cooking…";
    if (dlVer) dlVer.innerHTML = `No installers yet — they're compiling on a laptop somewhere. <a href="${RELEASES_URL}" target="_blank" rel="noopener" style="color:var(--accent)">Star the repo</a> and I'll holler when they land.`;
    cards.forEach(setComingSoon);
  }
}

/* ---------- UI interactions ---------- */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  els.forEach(e => io.observe(e));
}

function initNav() {
  const nav = document.getElementById("nav");
  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("nav-links");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const open = links.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    links.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
      links.classList.remove("open"); toggle.classList.remove("open"); toggle.setAttribute("aria-expanded", "false");
    }));
  }
}

function initCopy() {
  document.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const el = document.getElementById(btn.dataset.copy);
      if (!el) return;
      try {
        await navigator.clipboard.writeText(el.textContent.trim());
        const old = btn.textContent; btn.textContent = "Copied"; setTimeout(() => (btn.textContent = old), 1400);
      } catch (_) {}
    });
  });
}

function initShots() {
  // Until a screenshot PNG is added, show a clean "coming soon" panel instead
  // of a broken-image icon.
  document.querySelectorAll(".shot img").forEach(img => {
    const fail = () => img.closest(".shot").classList.add("shot-empty");
    if (img.complete && img.naturalWidth === 0) fail();
    img.addEventListener("error", fail);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
  initNav();
  initReveal();
  initCopy();
  initShots();
  wireDownloads();
});
