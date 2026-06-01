const { getProgressHandler } = require('../packages/shared/src/controllers/progressController');

// Mock Express req/res
const req = {
  headers: {
    authorization: undefined // No auth header to bypass user overwrite, simulating a teacher view or fallback
  },
  query: {
    studentId: '1d35f31e-cd22-4637-b0ab-c9180f7de572'
  }
};

const res = {
  status(code) {
    console.log(`Response Status: ${code}`);
    return this;
  },
  json(data) {
    console.log('Response JSON:', JSON.stringify(data, null, 2));
    return this;
  }
};

async function main() {
  console.log('Testing getProgressHandler...');
  await getProgressHandler(req, res);
}

main();
