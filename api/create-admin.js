// api/create-admin.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { adminUsername, secretKey } = body || {};

    if (!adminUsername || !secretKey) {
      return res.status(400).json({ error: "Data tidak lengkap." });
    }

    // cek secret key khusus admin
    if (secretKey !== process.env.ZEROIX_ADMIN_SECRET) {
      return res.status(401).json({ error: "Secret key admin salah / tidak valid." });
    }

    // env pterodactyl
    const panelUrl = process.env.PTERO_PANEL_URL;
    const apiUrl = process.env.PTERO_API_URL;
    const apiKey = process.env.PTERO_API_KEY;

    if (!panelUrl || !apiUrl || !apiKey) {
      return res.status(500).json({
        error: "Konfigurasi panel belum lengkap. Cek Environment Variables di Vercel.",
      });
    }

    const generatePassword = (length = 14) => {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
      let pass = "";
      for (let i = 0; i < length; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return pass;
    };

    const password = generatePassword(14);
    const safeUsername = adminUsername.replace(/[^a-zA-Z0-9_.-]/g, "_").toLowerCase();
    const timestamp = Date.now();
    const email = `admin_${safeUsername}_${timestamp}@zeroix.local`;

    // create user admin (root_admin: true)
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
        last_name: "Admin",
        password,
        language: "en",
        root_admin: true,
      }),
    });

    if (!userResp.ok) {
      const err = await safeJson(userResp);
      console.error("Error create admin:", err);
      throw new Error(`Gagal membuat admin di panel (status ${userResp.status}).`);
    }

    const userData = await userResp.json();
    const user = userData.attributes;

    return res.status(200).json({
      panelURL: panelUrl,
      user: {
        username: user.username,
        email: user.email,
      },
      password,
      isAdmin: true,
    });
  } catch (err) {
    console.error("Internal Error (create-admin):", err);
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
