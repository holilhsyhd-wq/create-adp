// CLOCK REALTIME
setInterval(() => {
  const now = new Date();
  document.getElementById("clock").innerText =
    now.toLocaleTimeString("id-ID");
}, 1000);


// CREATE PANEL
async function createPanel() {
  const username = document.getElementById("usernamePanel").value;
  const ram = document.getElementById("ram").value;
  const secretKey = document.getElementById("keyPanel").value;

  const res = await fetch("/api/create-panel", {
    method: "POST",
    body: JSON.stringify({ usernamePanel: username, ram, secretKey }),
  });

  const data = await res.json();
  document.getElementById("resultPanel").innerText =
    JSON.stringify(data, null, 2);
}


// CREATE ADMIN
async function createAdmin() {
  const usernameAdmin = document.getElementById("usernameAdmin").value;
  const passwordAdmin = document.getElementById("passwordAdmin").value;
  const secretKey = document.getElementById("keyAdmin").value;

  const res = await fetch("/api/create-admin", {
    method: "POST",
    body: JSON.stringify({ usernameAdmin, passwordAdmin, secretKey }),
  });

  const data = await res.json();
  document.getElementById("resultAdmin").innerText =
    JSON.stringify(data, null, 2);
}
