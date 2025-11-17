// api/create-panel.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { panelUsername, serverName, ram, secretKey } = body || {};

    if (!panelUsername || !serverName || !ram || !secretKey) {
      return res.status(400).json({ error: "Data tidak lengkap." });
    }

    // cek secret key khusus panel
    if (secretKey !== process.env.ZEROIX_PANEL_SECRET) {
      return res.status(401).json({ error: "Secret key panel salah / tidak valid." });
    }

    // env pterodactyl
    const panelUrl = process.env.PTERO_PANEL_URL;
    const apiUrl = process.env.PTERO_API_URL;
    const apiKey = process.env.PTERO_API_KEY;
    const eggId = process.env.PTERO_EGG_ID;
    const dockerImage = process.env.PTERO_DOCKER_IMAGE;
    const startupCmd = process.env.PTERO_STARTUP;
    const defaultAllocationId = process.env.PTERO_DEFAULT_ALLOCATION_ID;

    const defaultDisk = parseInt(process.env.PTERO_DEFAULT_DISK || "10240", 10);
    const defaultCpu = parseInt(process.env.PTERO_DEFAULT_CPU || "0", 10);
    const defaultDatabases = parseInt(process.env.PTERO_DEFAULT_DATABASES || "2", 10);
    const defaultBackups = parseInt(process.env.PTERO_DEFAULT_BACKUPS || "2", 10);
    const defaultAllocations = parseInt(process.env.PTERO_DEFAULT_ALLOCATIONS || "1", 10);

    if (
      !panelUrl ||
      !apiUrl ||
      !apiKey ||
      !eggId ||
      !dockerImage ||
      !startupCmd ||
      !defaultAllocationId
    ) {
      return res.status(500).json({
        error: "Konfigurasi panel belum lengkap. Cek Environment Variables di Vercel.",
      });
    }

    const generatePassword = (length = 12) => {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
      let pass = "";
      for (let i = 0; i < length; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return pass;
    };

    const password = generatePassword(12);
    const safeUsername = panelUsername.replace(/[^a-zA-Z0-9_.-]/g, "_").toLowerCase();
    const timestamp = Date.now();
    const email = `user_${safeUsername}_${timestamp}@zeroix.local`;

    // 1) create user biasa
    const userResp = await fetch(`${apiUrl}/api/application/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        username: safeUsername,
        email,
        first_name: "Zeroix",
        last_name: "Member",
        password,
        language: "en",
        root_admin: false,
      }),
    });

    if (!userResp.ok) {
      const err = await safeJson(userResp);
      console.error("Error create user:", err);
      throw new Error(`Gagal membuat user di panel (status ${userResp.status}).`);
    }

    const userData = await userResp.json();
    const user = userData.attributes;

    // 2) create server
    const memoryLimit = parseInt(ram, 10);

    const serverBody = {
      name: serverName,
      description: `Server dibuat via Zeroix Dashboard`,
      user: user.id,
      egg: parseInt(eggId, 10),
      docker_image: dockerImage,
      startup: startupCmd,
      limits: {
        memory: memoryLimit,
        swap: 0,
        disk: defaultDisk,
        io: 500,
        cpu: defaultCpu,
      },
      feature_limits: {
        databases: defaultDatabases,
        allocations: defaultAllocations,
        backups: defaultBackups,
      },
      allocation: {
        default: parseInt(defaultAllocationId, 10),
      },
      environment: {
        NODE_ENV: "production",
      },
    };

    const serverResp = await fetch(`${apiUrl}/api/application/servers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify(serverBody),
    });

    if (!serverResp.ok) {
      const err = await safeJson(serverResp);
      console.error("Error create server:", err);
      throw new Error(`Gagal membuat server di panel (status ${serverResp.status}).`);
    }

    const serverData = await serverResp.json();
    const server = serverData.attributes;

    return res.status(200).json({
      panelURL: panelUrl,
      user: {
        username: user.username,
        email: user.email,
      },
      password,
      server: {
        name: server.name,
        limits: server.limits,
      },
    });
  } catch (err) {
    console.error("Internal Error (create-panel):", err);
    return res.status(500).json({ error: err.message || "Terjadi kesalahan di server." });
  }
}

async function safeJson(resp) {
  try {
    return await resp.json();
  } catch {
    return { raw: await resp.text() };
  }
}
