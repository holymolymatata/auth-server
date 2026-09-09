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
    const kakaoRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const kakaoData = await kakaoRes.json();
    if (!kakaoData.id) {
      return res.status(401).json({ error: 'Invalid Kakao access token' });
    }

    const uid = `kakao_${kakaoData.id}`;
    const email = kakaoData.kakao_account?.email || `${uid}@kakao.local`;

    const customToken = await admin.auth().createCustomToken(uid, { email });
    return res.status(200).json({ customToken });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
