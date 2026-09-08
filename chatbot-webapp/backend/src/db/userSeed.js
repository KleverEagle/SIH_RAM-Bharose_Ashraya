const db = require('./firebase');
const bcrypt = require('bcrypt');

async function createTestUsers() {
    const users = [
        {
            id: 'V_001',
            username: 'john',
            email: 'john@test.com',
            password: 'password123',
            phone: '9876543210',
            name: 'John'
        },
        {
            id: 'V_002',
            username: 'alice',
            email: 'alice@test.com',
            password: 'alice123',
            phone: '9876543211',
            name: 'Alice'
        }
    ];

    for (const user of users) {
        const password_hash = await bcrypt.hash(user.password, 10);

        await db.collection('victims').doc(user.id).set({
            username: user.username,
            email: user.email,
            password_hash,
            phone: user.phone,
            name: user.name
        });
    }

    console.log('Test users created');
}

createTestUsers();
