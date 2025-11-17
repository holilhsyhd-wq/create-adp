// api/createPanel.js

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
      panelUsername,
      panelPassword,
      panelRam,
      panelSecret,
    } = body || {};

    if (!panelUsername || !panelPassword || !panelRam || !panelSecret) {
      return res.status(400).json({ error: 'Data form tidak lengkap.' });
    }

    // Validasi secret key PANEl
    const expectedSecret =
      process.env.ZEROIX_PANEL_SECRET || 'barmods21';

    if (panelSecret !== expectedSecret) {
      return res.status(401).json({ error: 'Secret key panel salah.' });
    }

    // ENV dari .env / Vercel
    const panelUrl = process.env.PTERO_PANEL_URL; // contoh: https://panel.zeroix.com
    const apiUrl = process.env.PTERO_API_URL;     // contoh: https://panel.zeroix.com
    const apiKey = process.env.PTERO_API_KEY;     // Application API key
    const eggId = process.env.PTERO_EGG_ID;
    const dockerImage = process.env.PTERO_DOCKER_IMAGE;
    const startupCmd = process.env.PTERO_STARTUP;
    const allocationId = process.env.PTERO_DEFAULT_ALLOCATION_ID;

    const defaultDisk = parseInt(
      process.env.PTERO_DEFAULT_DISK || '10240',
      10
    );
    const defaultCpu = parseInt(process.env.PTERO_DEFAULT_CPU || '0', 10);

    if (
      !panelUrl ||
      !apiUrl ||
      !apiKey ||
      !eggId ||
      !dockerImage ||
      !startupCmd ||
      !allocationId
    ) {
      return res.status(500).json({
        error: 'Konfigurasi Pterodactyl belum lengkap di environment variables.',
      });
    }

    // Generate email
    const timestamp = Date.now();
    const email = `${panelUsername}_${timestamp}@zeroix.local`;

    // 1) Buat USER di Pterodactyl
    const userResp = await fetch(`${apiUrl}/api/application/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        username: panelUsername,
        email,
        first_name: 'Zeroix',
        last_name: 'Member',
        password: panelPassword,
        language: 'en',
        root_admin: false,
      }),
    });

    if (!userResp.ok) {
      const errBody = await safeJson(userResp);
      console.error('Create panel user error:', errBody);
      return res.status(500).json({
        error: `Gagal membuat user panel (status ${userResp.status}).`,
      });
    }

    const userData = await userResp.json();
    const user = userData.attributes;

    // 2) Buat SERVER untuk user ini
    const memoryLimit = parseInt(panelRam, 10);

    const serverName = `${panelUsername}-server`;

    const serverResp = await fetch(`${apiUrl}/api/application/servers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        name: serverName,
        description: `Created from Zeroix Dashboard for ${panelUsername}`,
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
          default: parseInt(allocationId, 10),
        },
        environment: {
          NODE_ENV: 'production',
          PANEL_USER: panelUsername,
        },
        deploy: {
          locations: [],
          dedicated_ip: false,
          port_range: [],
        },
      }),
    });

    if (!serverResp.ok) {
      const errBody = await safeJson(serverResp);
      console.error('Create server error:', errBody);
      return res.status(500).json({
        error: `User berhasil dibuat, namun gagal membuat server (status ${serverResp.status}).`,
      });
    }

    const serverData = await serverResp.json();
    const server = serverData.attributes;

    return res.status(200).json({
      panelURL: panelUrl,
      user: {
        username: user.username,
        email: user.email,
      },
      password: panelPassword,
      server: {
        name: server.name,
        limits: server.limits,
      },
    });
  } catch (err) {
    console.error('Internal error (createPanel):', err);
    return res.status(500).json({
      error: err.message || 'Terjadi kesalahan di server.',
    });
  }
}
