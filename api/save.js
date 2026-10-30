// Serverless endpoint para o Painel Admin da Lancha Mikhael (lanchamkparaty.com.br)
const REPO_OWNER = 'graficoscripto-cmyk';
const REPO_NAME = 'lancha-mikhael-paraty';
const VALID_PASSWORDS = new Set(['haroldo2026', 'haroldo', 'mikhael2026']);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const pass = String(body.password || '').trim().toLowerCase();
    if (!VALID_PASSWORDS.has(pass)) {
      return res.status(401).json({ error: 'Senha inválida.' });
    }

    const token = body.token || process.env.GH_TOKEN || '';
    if (!token) {
      return res.status(503).json({ error: 'Token GitHub ausente no servidor.' });
    }

    const path = String(body.path || 'site-data.json').replace(/^\/+/, '');
    const message = String(body.message || 'Atualização pelo Painel Lancha Mikhael');
    const isBase64 = Boolean(body.isBase64);
    const contentRaw = body.content;

    if (!contentRaw) {
      return res.status(400).json({ error: 'Conteúdo vazio.' });
    }

    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
    let sha = undefined;

    const getRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'lancha-mikhael-admin'
      }
    });

    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    const b64 = isBase64
      ? contentRaw
      : Buffer.from(typeof contentRaw === 'string' ? contentRaw : JSON.stringify(contentRaw, null, 2), 'utf8').toString('base64');

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'lancha-mikhael-admin'
      },
      body: JSON.stringify({
        message,
        content: b64,
        sha,
        branch: 'main'
      })
    });

    if (!putRes.ok) {
      const errTxt = await putRes.text();
      return res.status(putRes.status).json({ error: errTxt });
    }

    const out = await putRes.json();
    return res.status(200).json({ ok: true, sha: out.content && out.content.sha });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
};
