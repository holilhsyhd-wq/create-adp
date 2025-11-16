// api/create.js
// Vercel Node.js Serverless Function

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { mode, serverName, ram, secretKey } = body || {};

    if (!mode || !secretKey) {
      return res.status(400).json({ error: "Mode dan Secret Key wajib diisi." });
    }

    // ====== VALIDASI SECRET KEY ======
    if (mode === "panel") {
      if (secretKey !== "barmods21") {
        return res.status(401).json({ error: "Secret key panel salah." });
      }
      if (!serverName || !ram) {
        return res
          .status(400)
          .json({ error: "Nama server dan RAM wajib diisi untuk mode panel." });
      }
    } else if (mode === "admin") {
      if (secretKey !== "barmods22") {
        return res.status(401).json({ error: "Secret key admin salah." });
      }
      // untuk admin, serverName & ram tidak dipakai (boleh diabaikan)
    } else {
      return res.status(400).json({ error: "Mode tidak valid." });
    }

    // ====== KONFIGURASI PANEL DARI ENV (EDIT DI VERCEL) ======
    const panelUrl = process.env.PTERO_PANEL_URL; // contoh: https://panel.zeroix.com
    const apiUrl = process.env.PTERO_API_URL; // contoh: https://panel.zeroix.com
    const apiKey = process.env.PTERO_API_KEY; // Application API Key

    const eggId = process.env.PTERO_EGG_ID; // ID egg untuk server panel
    const dockerImage = process.env.PTERO_DOCKER_IMAGE;
    const startupCmd = process.env.PTERO_STARTUP;
    const defaultAllocationId = process.env.PTERO_DEFAULT_ALLOCATION_ID;
    const defaultDisk = parseInt(process.env.PTERO_DEFAULT_DISK || "10240", 10);
    const defaultCpu = parseInt(process.env.PTERO_DEFAULT_CPU || "0", 10);

    if (!panelUrl || !apiUrl || !apiKey) {
      return res.status(500).json({
        error: "Konfigurasi Pterodactyl belum lengkap di environment Vercel.",
      });
    }

    if (
      mode === "panel" &&
      (!eggId || !dockerImage || !startupCmd || !defaultAllocationId)
    ) {
      return res.status(500).json({
        error:
          "Konfigurasi server (egg, docker image, startup, allocation) belum lengkap.",
      });
    }

    // ====== HELPER ======
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
    const timestamp = Date.now();
    const username = `zeroix_${mode}_${timestamp}`;
    const email = `user${timestamp}@zeroix.local`;

    // ====== 1) BUAT USER DI PTERODACTYL ======
    const userResp = await fetch(`${apiUrl}/api/application/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: JSON.stringify({
        username,
        email,
        first_name: mode === "admin" ? "Zeroix" : "ZeroixPanel",
        last_name: mode === "admin" ? "Admin" : "Member",
        password,
        language: "en",
        root_admin: mode === "admin", // admin = true
      }),
    });

    if (!userResp.ok) {
      const err = await safeJson(userResp);
      console.error("Error create user:", err);
      throw new Error(
        `Gagal membuat user di panel (status ${userResp.status}).`
      );
    }

    const userJson = await userResp.json();
    const user = userJson.attributes;

    // ====== 2) JIKA MODE PANEL: BUAT SERVER ======
    if (mode === "panel") {
      const memoryLimit = parseInt(ram, 10);

      const serverBody = {
        name: serverName,
        description: `Server dibuat via Zeroix Panel`,
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
          databases: 2,
          allocations: 1,
          backups: 2,
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
        throw new Error(
          `Gagal membuat server di panel (status ${serverResp.status}).`
        );
      }

      const serverJson = await serverResp.json();
      const server = serverJson.attributes;

      return res.status(200).json({
        mode: "panel",
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
    }

    // ====== MODE ADMIN: HANYA BUAT ADMIN, TANPA SERVER ======
    return res.status(200).json({
      mode: "admin",
      panelURL: panelUrl,
      user: {
        username: user.username,
        email: user.email,
      },
      password,
    });
  } catch (err) {
    console.error("Internal Error:", err);
    return res.status(500).json({
      error: err.message || "Terjadi kesalahan di server.",
    });
  }
}

// helper biar error dari panel yang bukan JSON ga bikin crash
async function safeJson(resp) {
  try {
    return await resp.json();
  } catch {
    return { raw: await resp.text() };
  }
}
