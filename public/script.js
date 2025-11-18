// public/script.js

// ========== CLOCK ==========
const clockEl = document.getElementById("clock");

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  if (clockEl) clockEl.textContent = `${h}:${m}:${s}`;
}

setInterval(updateClock, 1000);
updateClock();

// ========== HELPER ==========
async function callApi(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // kalau status bukan 2xx, baca text biar gak error JSON
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request gagal (status ${res.status})`);
  }

  // aman untuk parse JSON
  return res.json();
}

// ========== CREATE PANEL ==========
async function createPanel() {
  const usernamePanel = document.getElementById("usernamePanel").value.trim();
  const ramSelect = document.getElementById("ram");
  const ram = ramSelect.value;
  const secretKey = document.getElementById("keyPanel").value.trim();
  const resultBox = document.getElementById("resultPanel");

  if (!usernamePanel || !ram || !secretKey) {
    resultBox.className = "result error";
    resultBox.textContent = "Harap isi semua field.";
    return;
  }

  // Unlimited dikirim sebagai "0" (sesuai backend Number(ram))
  const ramToSend = ram === "unlimited" ? "0" : ram;

  resultBox.className = "result info";
  resultBox.textContent = "⏳ Membuat panel & server...";

  try {
    const data = await callApi("/api/create-panel", {
      usernamePanel,
      ram: ramToSend,
      secretKey,
    });

    resultBox.className = "result success";
    resultBox.innerHTML = `
      ✅ Panel & Server berhasil dibuat!<br><br>
      <strong>URL Panel:</strong> ${data.panelURL}<br>
      <strong>Username:</strong> ${data.user.username}<br>
      <strong>Email:</strong> ${data.user.email}<br>
      <strong>Password:</strong> ${data.password}<br><br>
      <strong>Server Name:</strong> ${data.server.name}<br>
      <strong>RAM:</strong> ${data.server.limits.memory} MB
    `;
  } catch (err) {
    console.error(err);
    resultBox.className = "result error";
    resultBox.textContent = `❌ Error: ${err.message}`;
  }
}

// ========== CREATE ADMIN ==========
async function createAdmin() {
  const usernameAdmin = document
    .getElementById("usernameAdmin")
    .value.trim();
  const passwordAdmin = document
    .getElementById("passwordAdmin")
    .value.trim();
  const secretKey = document.getElementById("keyAdmin").value.trim();
  const resultBox = document.getElementById("resultAdmin");

  if (!usernameAdmin || !passwordAdmin || !secretKey) {
    resultBox.className = "result error";
    resultBox.textContent = "Harap isi semua field.";
    return;
  }

  resultBox.className = "result info";
  resultBox.textContent = "⏳ Membuat admin panel...";

  try {
    const data = await callApi("/api/create-admin", {
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
    console.error(err);
    resultBox.className = "result error";
    resultBox.textContent = `❌ Error: ${err.message}`;
  }
}

// Biar bisa dipanggil dari onclick di HTML
window.createPanel = createPanel;
window.createAdmin = createAdmin;
