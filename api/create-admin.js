// api/createAdmin.js

async function safeJson(resp) {
  try {
    return await resp.json();
  } catch {
    try {
      const text = await resp.text();
      return { raw: text };
    } catch {
      return {};
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    const {
      adminUsername,
      adminPassword,
      adminSecret,
    } = body || {};

    if (!adminUsername || !adminPassword || !adminSecret) {
      return res.status(400).json({ error: 'Data form tidak lengkap.' });
    }

    // Validasi secret key ADMIN
    const expectedSecret =
      process.env.ZEROIX_ADMIN_SECRET || 'barmods22';

    if (adminSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Secret key admin salah.' });
    }

    const panelUrl = process.env.PTERO_PANEL_URL;
    const apiUrl = process.env.PTERO_API_URL;
    const apiKey = process.env.PTERO_API_KEY;

    if (!panelUrl || !apiUrl || !apiKey) {
      return res.status(500).json({
        error: 'Konfigurasi Pterodactyl belum lengkap di environment variables.',
      });
    }

    const timestamp = Date.now();
    const email = `${adminUsername}_${timestamp}@zeroix.local`;

    const userResp = await fetch(`${apiUrl}/api/application/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        username: adminUsername,
        email,
        first_name: 'Zeroix',
        last_name: 'Admin',
        password: adminPassword,
        language: 'en',
        root_admin: true,
      }),
    });

    if (!userResp.ok) {
      const errBody = await safeJson(userResp);
      console.error('Create admin error:', errBody);
      return res.status(500).json({
        error: `Gagal membuat admin (status ${userResp.status}).`,
      });
    }

    const userData = await userResp.json();
    const user = userData.attributes;

    return res.status(200).json({
      panelURL: panelUrl,
      user: {
        username: user.username,
        email: user.email,
      },
      password: adminPassword,
    });
  } catch (err) {
    console.error('Internal error (createAdmin):', err);
    return res.status(500).json({
      error: err.message || 'Terjadi kesalahan di server.',
    });
  }
}
