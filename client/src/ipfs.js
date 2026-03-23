import axios from 'axios';

/**
 * Pinata JWT must be set at build time via Vite env (never commit real values).
 * Create `client/.env` with: VITE_PINATA_JWT=your_jwt
 * For production, prefer a backend that holds the secret instead of exposing it in the browser bundle.
 */
const getPinataJwt = () => {
  const jwt = import.meta.env.VITE_PINATA_JWT;
  if (!jwt || String(jwt).trim() === '') {
    throw new Error(
      'Missing VITE_PINATA_JWT. Add it to client/.env (see client/.env.example).'
    );
  }
  return jwt.trim();
};

const uploadToPinata = async (buffer, fileName) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  const JWT = getPinataJwt();

  const data = new FormData();
  data.append('file', new Blob([buffer]), fileName);

  const metadata = JSON.stringify({
    name: fileName,
  });
  data.append('pinataMetadata', metadata);

  try {
    const res = await axios.post(url, data, {
      maxBodyLength: 'Infinity',
      headers: {
        'Content-Type': `multipart/form-data`,
        Authorization: `Bearer ${JWT}`,
      },
    });

    return res.data.IpfsHash;
  } catch (error) {
    console.error('Pinata Error Detail:', error.response?.data || error.message);
    throw error;
  }
};

export default uploadToPinata;
