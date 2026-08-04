import { sign } from 'jsonwebtoken';
import axios from 'axios';

async function run() {
  try {
    const token = sign({
      sub: '6877b37d-5467-4c30-821c-94391b7bd18b', // admin id
      orgId: '25d7772d-35b8-4896-9c3e-d4351790273d', // org id
      role: 'admin',
      email: 'admin@polda.go.id'
    }, 'change-this-to-a-long-random-secret-string-for-production', { expiresIn: '1h' });

    console.log("Token:", token);

    // 2. Patch person
    const res = await axios.patch('http://localhost:3000/api/v1/watchlist/e057bc19-7c9f-4fb5-acc1-4fcbcf7cdd8f', {
      full_name: 'Test Edit Name Updated',
      alias: ['AliasUpdate'],
      danger_level: 'critical',
      description: 'Test note update'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("Success:", res.data);
  } catch (err: any) {
    console.error("Error:", err.response?.status, err.response?.data || err.message);
  }
}
run();
