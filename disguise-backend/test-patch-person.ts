import axios from 'axios';

async function run() {
  try {
    // 1. Get token
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'admin@disguise.id',
      password: 'password123' // default password from seed
    });
    const token = loginRes.data.data.token;

    // 2. Patch person
    const res = await axios.patch('http://localhost:3000/api/v1/watchlist/e057bc19-7c9f-4fb5-acc1-4fcbcf7cdd8f', {
      full_name: 'Test Edit Name',
      alias: ['Alias1'],
      danger_level: 'critical',
      description: 'Test note'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("Success:", res.data);
  } catch (err: any) {
    console.error("Error:", err.response?.status, err.response?.data || err.message);
  }
}
run();
