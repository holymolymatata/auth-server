const admin = require('firebase-admin');
const fetch = require('node-fetch');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ error: 'Access token is required' });

  try {
    const naverRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const naverData = await naverRes.json();
    if (naverData.resultcode !== "00" || !naverData.response) {
      return res.status(401).json({ error: 'Invalid Naver access token' });
    }

    const naverUser = naverData.response;
    const uid = `naver_${naverUser.id}`;
    const email = naverUser.email || `${uid}@naver.local`;

    const customToken = await admin.auth().createCustomToken(uid, { email });
    return res.status(200).json({ customToken });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
