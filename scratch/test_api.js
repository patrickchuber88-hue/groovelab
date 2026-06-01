const fetch = require('node-fetch');

async function main() {
  const studentId = '1d35f31e-cd22-4637-b0ab-c9180f7de572';
  const url = `http://localhost:3000/api/student/get-progress?studentId=${studentId}`;
  
  console.log('Fetching progress from API...');
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.error(`HTTP error: ${resp.status}`);
      const text = await resp.text();
      console.error(text);
      return;
    }

    const data = await resp.json();
    console.log(`Success: ${data.success}, isPremiumActive: ${data.isPremiumActive}`);
    console.log(`Progress items count: ${data.progress ? data.progress.length : 0}`);
    if (data.progress) {
      data.progress.forEach((item, idx) => {
        if (item.is_current_homework) {
          console.log(`[${idx}] "${item.topic_name}" - is_current_homework: ${item.is_current_homework}, homework_notes: "${item.homework_notes}"`);
        }
      });
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

main();
