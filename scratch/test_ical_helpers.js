// Test ical anonymization helpers
const getInitials = (firstName, lastName) => {
  const getPartInitials = (nameStr) => {
    if (!nameStr) return '';
    return nameStr.trim().split(/\s+/).map(part => {
      return part.split('-').map(subPart => subPart ? subPart[0].toUpperCase() + '.' : '').join('-');
    }).join(' ');
  };
  const firstInit = getPartInitials(firstName);
  const lastInit = getPartInitials(lastName);
  return [firstInit, lastInit].filter(Boolean).join(' ');
}

// Test cases
const testCases = [
  { first: "Jonas", last: "Müller", expected: "J. M." },
  { first: "Anna-Lena", last: "Schmidt", expected: "A.-L. S." },
  { first: "Max", last: "Müller-Weber", expected: "M. M.-W." },
  { first: "Jan Paul", last: "Fischer", expected: "J. P. F." },
  { first: "Jonas", last: "", expected: "J." },
  { first: "", last: "Müller", expected: "M." },
  { first: "", last: "", expected: "" }
];

console.log("=== Testing iCal Anonymization Helper ===");
let passed = 0;
for (const tc of testCases) {
  const result = getInitials(tc.first, tc.last);
  const ok = result === tc.expected;
  console.log(`Input: "${tc.first}" / "${tc.last}" => Result: "${result}" | Expected: "${tc.expected}" | ${ok ? "✅ PASS" : "❌ FAIL"}`);
  if (ok) passed++;
}
console.log(`Passed ${passed}/${testCases.length} tests.`);
if (passed !== testCases.length) {
  process.exit(1);
}
