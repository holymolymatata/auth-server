const admin = require('firebase-admin');
const fetch = require('node-fetch');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const { accessToken } = req.body;
  if (!accessToken) return res.status(400).json({ error: 'Access token is required' });

  try {
    // 1. 네이버 서버에 토큰 검증 및 유저 정보 요청
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

    // 2. 파이어베이스 커스텀 토큰 발급
    const customToken = await admin.auth().createCustomToken(uid, { email });
    return res.status(200).json({ customToken });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
