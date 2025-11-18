// public/script.js

// =======================
// Realtime Clock
// =======================
function updateClock() {
  const el = document.getElementById("clock");
  if (!el) return;

  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");

  el.textContent = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

// =======================
// Helper: panggil API JSON
// =======================
async function callJsonApi(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // Ambil text dulu (kadang error balas HTML kalau 404/500)
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    // Kalau bukan JSON, lempar apa adanya
    throw new Error(text || "Terjadi kesalahan tak dikenal.");
  }

  if (!res.ok) {
    throw new Error(data.error || "Terjadi kesalahan pada server.");
  }

  return data;
}

// =======================
// Create Panel (user biasa + server)
// =======================
async function createPanel() {
  const usernameInput = document.getElementById("usernamePanel");
  const ramSelect = document.getElementById("ram");
  const keyInput = document.getElementById("keyPanel");
  const resultBox = document.getElementById("resultPanel");

  if (!usernameInput || !ramSelect || !keyInput || !resultBox) return;

  const btn = document.querySelector(".card button[onclick='createPanel()']");
  if (btn) btn.disabled = true;

  const usernamePanel = usernameInput.value.trim();
  const ramRaw = ramSelect.value;
  const secretKey = keyInput.value.trim();

  // konversi RAM (Unlimited -> 0; sisanya tetap value dari select)
  const ram = ramRaw === "unlimited" ? 0 : Number(ramRaw);

  resultBox.className = "result info";
  resultBox.textContent = "⏳ Memproses pembuatan panel...";

  try {
    const data = await callJsonApi("/api/create-panel", {
      usernamePanel,
      ram,
      secretKey,
    });

    // Tampilkan hasil
    resultBox.className = "result success";
    resultBox.innerHTML = `
      ✅ Panel & server berhasil dibuat!<br><br>
      <strong>URL Panel:</strong> ${data.panelURL}<br>
      <strong>Username:</strong> ${data.user.username}<br>
      <strong>Email:</strong> ${data.user.email}<br>
      <strong>Password:</strong> ${data.password}<br><hr>
      <strong>Server Name:</strong> ${data.server?.name || "-"}<br>
      <strong>RAM:</strong> ${data.server?.limits?.memory ?? ram} MB
    `;
  } catch (err) {
    resultBox.className = "result error";
    resultBox.textContent = `❌ Error: ${err.message}`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// =======================
// Create Admin (root_admin tanpa server)
// =======================
async function createAdmin() {
  const usernameInput = document.getElementById("usernameAdmin");
  const passwordInput = document.getElementById("passwordAdmin");
  const keyInput = document.getElementById("keyAdmin");
  const resultBox = document.getElementById("resultAdmin");

  if (!usernameInput || !passwordInput || !keyInput || !resultBox) return;

  const btn = document.querySelector(".card button[onclick='createAdmin()']");
  if (btn) btn.disabled = true;

  const usernameAdmin = usernameInput.value.trim();
  const passwordAdmin = passwordInput.value.trim();
  const secretKey = keyInput.value.trim();

  resultBox.className = "result info";
  resultBox.textContent = "⏳ Memproses pembuatan admin...";

  try {
    const data = await callJsonApi("/api/create-admin", {
      usernameAdmin,
      passwordAdmin,
      secretKey,
    });

    resultBox.className = "result success";
    resultBox.innerHTML = `
      👑 Admin Panel berhasil dibuat!<br><br>
      <strong>URL Panel:</strong> ${data.panelURL}<br>
      <strong>Username Admin:</strong> ${data.user.username}<br>
      <strong>Email:</strong> ${data.user.email}<br>
      <strong>Password:</strong> ${data.password}
    `;
  } catch (err) {
    resultBox.className = "result error";
    resultBox.textContent = `❌ Error: ${err.message}`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Biar fungsi bisa dipanggil dari onclick di HTML
window.createPanel = createPanel;
window.createAdmin = createAdmin;
