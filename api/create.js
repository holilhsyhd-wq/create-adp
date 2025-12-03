const axios = require("axios");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { serverName, username, password, ram, accountType, secretKey } = req.body || {};

  if (!serverName || !username || !password || !ram || !secretKey) {
    return res.status(400).json({ message: "Data tidak lengkap" });
  }

  // --- cek secret key ---
  if (accountType === "user" && secretKey !== "barmods21") {
    return res.status(403).json({ message: "Secret key untuk create panel Pterodactyl salah." });
  }
  if (accountType === "admin" && secretKey !== "barmods22") {
    return res.status(403).json({ message: "Secret key untuk create admin panel Pterodactyl salah." });
  }

  const API_URL = process.env.PTERO_API_URL; // contoh: https://panel.domainkamu.com
  const API_KEY = process.env.PTERO_API_KEY; // Application API key

  if (!API_URL || !API_KEY) {
    return res.status(500).json({ message: "ENV PTERO_API_URL / PTERO_API_KEY belum di-set" });
  }

  // --- mapping RAM → memory (MB) ---
  const ramMap = {
    "1GB": 1024,
    "2GB": 2048,
    "3GB": 3072,
    "4GB": 4096,
    "5GB": 5120,
    "6GB": 6144,
    "7GB": 7168,
    "8GB": 8192,
    "9GB": 9216,
    "UNLIMITED": 0
  };
  const memory = ramMap[ram] ?? 1024;

  // --- Pengaturan default untuk server baru ---
  const eggId      = 15;   // ID Egg (misal Node.js)
  const nestId     = 5;    // ID Nest (info saja, tidak wajib di payload)
  const locationId = 1;    // ID lokasi server
  const cpu        = 100;  // 100 = 1 core
  const disk       = 5120; // 5120 MB = 5 GB

  try {
    // 1. Create user (User / Admin Panel)
    const userPayload = {
      email: `${username}@example.local`,
      username,
      first_name: username,
      last_name: accountType === "admin" ? "Admin" : "User",
      password,
      root_admin: accountType === "admin",
      language: "en"
    };

    const userRes = await axios.post(
      `${API_URL}/api/application/users`,
      userPayload,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          Accept: "Application/vnd.pterodactyl.v1+json"
        }
      }
    );

    const userId = userRes.data?.attributes?.id;

    // 2. Create server untuk user tersebut
    const serverPayload = {
      name: serverName,
      user: userId,
      egg: eggId,
      docker_image: "ghcr.io/parkervcp/yolks:nodejs_18", // sesuaikan dengan egg kamu
      startup: "npm install && npm start",
      limits: {
        memory,
        swap: 0,
        disk,
        io: 500,
        cpu
      },
      feature_limits: {
        databases: 1,
        backups: 1,
        allocations: 1
      },
      deploy: {
        locations: [locationId],
        dedicated_ip: false,
        port_range: []
      },
      start_on_completion: true
    };

    await axios.post(
      `${API_URL}/api/application/servers`,
      serverPayload,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          Accept: "Application/vnd.pterodactyl.v1+json"
        }
      }
    );

    return res.status(200).json({
      message:
        accountType === "admin"
          ? "Secret benar. Akun ADMIN + server berhasil dibuat!"
          : "Secret benar. Akun user + server berhasil dibuat!"
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    return res.status(500).json({
      message: "Gagal membuat user/server. Cek konfigurasi API.",
      detail: err.response?.data || err.message
    });
  }
};
