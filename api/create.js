// api/create.js
// Hanya info, supaya tidak bingung endpoint mana yang dipakai
export default function handler(req, res) {
  return res.status(200).json({
    message:
      "Gunakan /api/create-panel untuk panel + server, atau /api/create-admin untuk admin panel.",
  });
}
