export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { usernamePanel, ram, secretKey } = body || {};

    if (!usernamePanel || !ram || !secretKey)
      return res.status(400).json({ error: "Data tidak lengkap." });

    if (secretKey !== process.env.ZEROIX_PANEL_SECRET)
      return res.status(401).json({ error: "Secret Key Panel salah." });

    const apiURL = process.env.PTERO_API_URL;
    const apiKey = process.env.PTERO_API_KEY;
    const panelURL = process.env.PTERO_PANEL_URL;

    const email = `user_${Date.now()}@zeroix.local`;
    const password = generatePassword(12);

    // CREATE USER
    const createUser = await fetch(`${apiURL}/api/application/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email,
        username: usernamePanel,
        first_name: "Zeroix",
        last_name: "User",
        password,
        root_admin: false,
      }),
    });

    if (!createUser.ok) {
      const err = await createUser.json();
      return res.status(422).json({
        error: err.errors?.[0]?.detail || "Gagal membuat user",
      });
    }

    const user = (await createUser.json()).attributes;

    // CREATE SERVER
    const createServer = await fetch(`${apiURL}/api/application/servers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: `srv-${usernamePanel}`,
        user: user.id,
        egg: Number(process.env.PTERO_EGG_ID),
        docker_image: process.env.PTERO_DOCKER_IMAGE,
        startup: process.env.PTERO_STARTUP,
        limits: {
          memory: Number(ram),
          swap: 0,
          disk: Number(process.env.PTERO_DEFAULT_DISK),
          io: 500,
          cpu: 0,
        },
        allocation: {
          default: Number(process.env.PTERO_DEFAULT_ALLOCATION_ID),
        },
      }),
    });

    if (!createServer.ok) {
      const err = await createServer.json();
      return res.status(422).json({
        error: err.errors?.[0]?.detail || "User dibuat, server gagal",
      });
    }

    const server = (await createServer.json()).attributes;

    return res.status(200).json({
      panelURL,
      user: {
        username: user.username,
        email: user.email,
      },
      password,
      server,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function generatePassword(len) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  return [...Array(len)]
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join("");
}
