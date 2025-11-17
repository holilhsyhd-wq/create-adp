// =========================
// REALTIME CLOCK
// =========================
function updateClock() {
  const clock = document.getElementById("clock");
  setInterval(() => {
    const now = new Date();
    clock.textContent =
      String(now.getHours()).padStart(2, "0") + ":" +
      String(now.getMinutes()).padStart(2, "0") + ":" +
      String(now.getSeconds()).padStart(2, "0");
  }, 1000);
}
updateClock();

// =========================
// CREATE PANEL
// =========================
async function createPanel() {
  const usernamePanel = document.getElementById("usernamePanel").value.trim();
  let ram = document.getElementById("ram").value;
  const secretKey = document.getElementById("keyPanel").value.trim();
  const result = document.getElementById("resultPanel");

  result.innerHTML = "Memproses...";
  result.style.color = "yellow";

  if (ram === "unlimited") ram = 0;

  try {
    const req = await fetch("/api/create-panel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernamePanel,
        ram,
        secretKey
      }),
    });

    const res = await req.json();

    if (!req.ok) {
      result.style.color = "red";
      result.innerHTML = "❌ " + (res.error || "Terjadi kesalahan");
      return;
    }

    result.style.color = "lightgreen";
    result.innerHTML = `
      <b>Panel Berhasil Dibuat!</b><br>
      URL: ${res.panelURL}<br>
      Username: ${res.user.username}<br>
      Email: ${res.user.email}<br>
      Password: ${res.password}
    `;
  } catch (err) {
    result.style.color = "red";
    result.innerHTML = "❌ Error: " + err.message;
  }
}

// =========================
// CREATE ADMIN
// =========================
async function createAdmin() {
  const usernameAdmin = document.getElementById("usernameAdmin").value.trim();
  const passwordAdmin = document.getElementById("passwordAdmin").value.trim();
  const secretKey = document.getElementById("keyAdmin").value.trim();
  const result = document.getElementById("resultAdmin");

  result.innerHTML = "Memproses...";
  result.style.color = "yellow";

  try {
    const req = await fetch("/api/create-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernameAdmin,
        passwordAdmin,
        secretKey
      }),
    });

    const res = await req.json();

    if (!req.ok) {
      result.style.color = "red";
      result.innerHTML = "❌ " + (res.error || "Terjadi kesalahan");
      return;
    }

    result.style.color = "lightgreen";
    result.innerHTML = `
      <b>Admin Berhasil Dibuat!</b><br>
      URL: ${res.panelURL}<br>
      Username: ${res.user.username}<br>
      Email: ${res.user.email}<br>
      Password: ${res.password}
    `;
  } catch (err) {
    result.style.color = "red";
    result.innerHTML = "❌ Error: " + err.message;
  }
}
