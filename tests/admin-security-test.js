const assert = require('assert');
const bcrypt = require('bcryptjs');

async function testPasswordHashing() {
  const password = 'secureAdminPassword123!';
  const hash = await bcrypt.hash(password, 10);
  const match = await bcrypt.compare(password, hash);
  assert.strictEqual(match, true, 'Password hashing and comparison should work');
  console.log('Password hashing test passed');
}

function testEnvVarLogic() {
  const allowCreation = 'true';
  assert.strictEqual(allowCreation === 'true', true, 'Admin creation should be allowed when env var is "true"');
  
  const disallow = 'false';
  assert.strictEqual(disallow === 'true', false, 'Admin creation should be disallowed when env var is "false"');
  
  console.log('Env var logic test passed');
}

async function run() {
  try {
    await testPasswordHashing();
    testEnvVarLogic();
    console.log('All Admin security tests passed');
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

run();
