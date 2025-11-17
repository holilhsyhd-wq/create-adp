export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { usernameAdmin, passwordAdmin, secretKey } = body || {};

    if (!usernameAdmin || !passwordAdmin || !secretKey)
      return res.status(400).json({ error: "Data tidak lengkap." });

    if (secretKey !== process.env.ZEROIX_ADMIN_SECRET)
      return res.status(401).json({ error: "Secret Key Admin salah." });

    const apiURL = process.env.PTERO_API_URL;
    const apiKey = process.env.PTERO_API_KEY;
    const panelURL = process.env.PTERO_PANEL_URL;

    const email = `admin_${Date.now()}@zeroix.local`;

    const createUser = await fetch(`${apiURL}/api/application/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email,
        username: usernameAdmin,
        first_name: "Zeroix",
        last_name: "Admin",
        password: passwordAdmin,
        root_admin: true,
      }),
    });

    if (!createUser.ok) {
      const err = await createUser.json();
      return res.status(422).json({
        error: err.errors?.[0]?.detail || "Gagal membuat admin",
      });
    }

    const user = (await createUser.json()).attributes;

    return res.status(200).json({
      panelURL,
      user: {
        username: user.username,
        email: user.email,
      },
      password: passwordAdmin,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
