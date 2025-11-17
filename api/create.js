// api/create.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { mode, serverName, ram, secretKey } = body || {};

    // Secret modes
    if (mode === "panel" && secretKey !== "barmods21") {
      return res.status(401).json({ error: "Secret key panel salah." });
    }
    if (mode === "admin" && secretKey !== "barmods22") {
      return res.status(401).json({ error: "Secret key admin salah." });
    }

    const panelUrl = process.env.PTERO_PANEL_URL;
    const apiUrl = process.env.PTERO_API_URL;
    const apiKey = process.env.PTERO_API_KEY;

    const eggId = process.env.PTERO_EGG_ID;
    const dockerImage = process.env.PTERO_DOCKER_IMAGE;
    const startupCmd = process.env.PTERO_STARTUP;
    const allocation = process.env.PTERO_DEFAULT_ALLOCATION_ID;

    const disk = parseInt(process.env.PTERO_DEFAULT_DISK || "10240", 10);
    const cpu = parseInt(process.env.PTERO_DEFAULT_CPU || "0", 10);

    // Random password
    const password = genPass(12);
    const timestamp = Date.now();
    const username = `zeroix_${mode}_${timestamp}`;
    const email = `user${timestamp}@zeroix.local`;

    // Create User
    const userResp = await fetch(`${apiUrl}/api/application/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        username,
        email,
        first_name: mode === "admin" ? "Zeroix" : "Member",
        last_name: mode === "admin" ? "Admin" : "Panel",
        password,
        root_admin: mode === "admin",
      }),
    });

    if (!userResp.ok) throw new Error("Gagal membuat user.");

    const userData = (await userResp.json()).attributes;

    // If mode=admin, selesai
    if (mode === "admin") {
      return res.status(200).json({
        mode,
        panelURL: panelUrl,
        password,
        user: { username, email },
      });
    }

    // Create server (mode panel)
    const serverResp = await fetch(`${apiUrl}/api/application/servers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: serverName,
        user: userData.id,
        egg: parseInt(eggId),
        docker_image: dockerImage,
        startup: startupCmd,
        limits: {
          memory: parseInt(ram),
          swap: 0,
          disk,
          io: 500,
          cpu,
        },
        feature_limits: {
          databases: 2,
          allocations: 1,
          backups: 2,
        },
        allocation: {
          default: parseInt(allocation),
        },
      }),
    });

    if (!serverResp.ok) throw new Error("Gagal membuat server.");

    const server = (await serverResp.json()).attributes;

    return res.status(200).json({
      mode,
      panelURL: panelUrl,
      user: { username, email },
      password,
      server,
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function genPass(len) {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}
