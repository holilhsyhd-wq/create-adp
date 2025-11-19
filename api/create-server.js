// api/create-server.js

// Secret Keys
const PANEL_SECRET_KEY = process.env.PANEL_SECRET_KEY || 'barmods21'; // create panel + server
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'barmods22'; // create admin account

// 1. LOAD CONFIG FROM ENV
const config = {
  private: {
    domain: process.env.PTERO_DOMAIN_PRIVATE,
    apiKey: process.env.PTERO_API_KEY_PRIVATE,
  },
  public: {
    domain: process.env.PTERO_DOMAIN_PUBLIC,
    apiKey: process.env.PTERO_API_KEY_PUBLIC,
  },
  shared: {
    eggId: parseInt(process.env.PTERO_EGG_ID),
    locationId: parseInt(process.env.PTERO_LOCATION_ID),
    disk: parseInt(process.env.PTERO_DISK) || 5120,
    cpu: parseInt(process.env.PTERO_CPU) || 100,
  }
};

// random string gen
function randomString(len = 10) {
  return Math.random().toString(36).slice(-len);
}

// CREATE USER (admin/user)
async function createUser(name, cfg, isAdmin = false) {
  const url = `${cfg.domain}/api/application/users`;

  const rand = randomString(6);
  const base = name.toLowerCase().replace(/\s+/g, '');

  const email = `${base}@${rand}.com`;
  const username = `${base}_${rand}`;
  const password = randomString(10);

  const userData = {
    email,
    username,
    first_name: name,
    last_name: isAdmin ? "Admin" : "User",
    password,
    root_admin: isAdmin
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await res.json();

    if (res.status === 201) {
      return { success: true, user: data.attributes, password };
    }

    return { success: false, error: data.errors?.[0]?.detail };
  } catch (err) {
    return { success: false, error: "Gagal terhubung ke API Pterodactyl." };
  }
}

// CREATE SERVER
async function createServer(uid, name, memory, pteroUserId, cfg, shared) {
  const url = `${cfg.domain}/api/application/servers`;

  const serverData = {
    name,
    user: pteroUserId,
    egg: shared.eggId,
    docker_image: "ghcr.io/parkervcp/yolks:nodejs_18",
    startup: `if [[ -d .git ]] && [[ {{AUTO_UPDATE}} == "1" ]]; then git pull; fi; if [[ ! -z \${NODE_PACKAGES} ]]; then /usr/local/bin/npm install \${NODE_PACKAGES}; fi; if [[ ! -z \${UNNODE_PACKAGES} ]]; then /usr/local/bin/npm uninstall \${UNNODE_PACKAGES}; fi; if [ -f /home/container/package.json ]; then /usr/local/bin/npm install; fi; if [[ ! -z \${CUSTOM_ENVIRONMENT_VARIABLES} ]]; then vars=$(echo \${CUSTOM_ENVIRONMENT_VARIABLES} | tr ";" "\\n"); for line in $vars; do export $line; done; fi; /usr/local/bin/\${CMD_RUN};`,
    environment: {
      USER_ID: uid || "web_created_user",
      CMD_RUN: "npm start",
      AUTO_UPDATE: "1",
      NODE_PACKAGES: "",
      UNNODE_PACKAGES: "",
      CUSTOM_ENVIRONMENT_VARIABLES: "",
    },
    limits: {
      memory: parseInt(memory), // 0 = Unlimited
      swap: 0,
      disk: shared.disk,
      io: 500,
      cpu: shared.cpu,
    },
    feature_limits: { databases: 1, allocations: 1, backups: 1 },
    deploy: { locations: [shared.locationId], dedicated_ip: false, port_range: [] },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(serverData),
    });

    const data = await res.json();

    if (res.status === 201) {
      return { success: true, data: data.attributes };
    }

    return { success: false, error: data.errors?.[0]?.detail };
  } catch (err) {
    return { success: false, error: "Gagal terhubung ke API Server." };
  }
}

// MAIN HANDLER (Vercel)
module.exports = async (req, res) => {

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const { serverName, ram, secretKey, serverType, actionType } = req.body;

  // Validate
  if (!serverName || !serverType || !secretKey || !actionType) {
    res.status(400).json({ error: "Semua field wajib diisi." });
    return;
  }

  // When creating panel+server
  if (actionType === "panel" && (ram === undefined || ram === null)) {
    res.status(400).json({ error: "RAM harus diisi." });
    return;
  }

  // Validate secrets
  if (actionType === "panel" && secretKey !== PANEL_SECRET_KEY) {
    res.status(401).json({ error: "Secret Key panel salah." });
    return;
  }
  if (actionType === "admin" && secretKey !== ADMIN_SECRET_KEY) {
    res.status(401).json({ error: "Secret Key admin salah." });
    return;
  }

  const shared = config.shared;
  const cfg = config[serverType];

  if (!cfg || !cfg.domain || !cfg.apiKey) {
    res.status(500).json({ error: "Panel belum dikonfigurasi di environment Vercel." });
    return;
  }

  // ADMIN MODE
  if (actionType === "admin") {
    const admin = await createUser(serverName, cfg, true);

    if (!admin.success) {
      res.status(500).json({ error: admin.error });
      return;
    }

    res.status(200).json({
      success: true,
      mode: "admin",
      panelURL: cfg.domain,
      user: admin.user,
      password: admin.password,
    });
    return;
  }

  // PANEL + SERVER MODE
  const user = await createUser(serverName, cfg, false);

  if (!user.success) {
    res.status(500).json({ error: user.error });
    return;
  }

  const server = await createServer(
    null,
    serverName,
    ram,
    user.user.id,
    cfg,
    shared
  );

  if (!server.success) {
    res.status(500).json({ error: server.error });
    return;
  }

  res.status(200).json({
    success: true,
    mode: "panel",
    panelURL: cfg.domain,
    user: user.user,
    password: user.password,
    server: server.data,
  });
};
