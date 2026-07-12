import { createClient } from '@supabase/supabase-js';

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';
const supabase = createClient('https://supabase.campus-groovelab.de', SERVICE_KEY);

const firstNames = [
  'Lukas', 'Leon', 'Luca', 'Finn', 'Elias', 'Emil', 'Liam', 'Ben', 'Noah', 'Henri',
  'Felix', 'Jonas', 'Paul', 'Luis', 'Julian', 'Maximilian', 'Moritz', 'Leo', 'Anton', 'Mila',
  'Emma', 'Mia', 'Sofia', 'Emilia', 'Hannah', 'Anna', 'Lea', 'Lina', 'Marie', 'Lena',
  'Ida', 'Ella', 'Clara', 'Leni', 'Lia', 'Maja', 'Frieda', 'Laura', 'Sophie', 'Charlotte'
];

const lastNames = [
  'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
  'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann',
  'Braun', 'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Schmitz', 'Krause', 'Meier'
];

const instruments = [
  'Klavier', 'Gitarre', 'E-Bass', 'Schlagzeug', 'Gesang', 'Keyboard', 'Querflöte', 'Violine', 'Trompete', 'Klarinette'
];

const schoolNames = [
  'Akkord Akademie Berlin',
  'Sound Center München',
  'Musikschule Klangwiese Hamburg',
  'Rhythmus & Groove Köln',
  'Konservatorium Frankfurt',
  'Melodie Schule Stuttgart',
  'Tonart Akademie Düsseldorf',
  'Symphonie Schule Leipzig',
  'Harmonie Institut Dortmund',
  'Beat Lab Essen'
];

const cities = [
  'Berlin', 'München', 'Hamburg', 'Köln', 'Frankfurt am Main',
  'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen'
];

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function run() {
  console.log("Starting dummy school and student generation...");

  for (let i = 0; i < 10; i++) {
    const schoolName = schoolNames[i];
    const city = cities[i];
    const studentCount = getRandomRange(400, 1000);
    
    console.log(`\nCreating School ${i + 1}/10: "${schoolName}" in ${city} (Target: ${studentCount} students)...`);
    
    // 1. Insert School
    const { data: schoolData, error: schoolError } = await supabase
      .from('schools')
      .insert({
        name: schoolName,
        city: city,
        status: 'active',
        is_trial: false,
        limits_enabled: false,
        has_campus_subscription: true,
        has_groovelab_subscription: true
      })
      .select()
      .single();

    if (schoolError) {
      console.error(`Failed to create school "${schoolName}":`, schoolError);
      continue;
    }

    const schoolId = schoolData.id;
    console.log(`School created successfully with ID: ${schoolId}`);

    // 2. Generate Students
    const students = [];
    for (let s = 0; s < studentCount; s++) {
      students.push({
        school_id: schoolId,
        role: 'student',
        first_name: getRandomElement(firstNames),
        last_name: getRandomElement(lastNames),
        instrument: getRandomElement(instruments),
        is_active: true,
        is_campus_active: true,
        is_groovelab_active: true,
        status: 'active'
      });
    }

    // 3. Batch Insert Students (batch size 200 to prevent timeout/payload issues)
    const batchSize = 200;
    let insertedCount = 0;
    for (let j = 0; j < students.length; j += batchSize) {
      const batch = students.slice(j, j + batchSize);
      const { error: studentError } = await supabase
        .from('users')
        .insert(batch);

      if (studentError) {
        console.error(`Error inserting student batch starting at index ${j} for school ${schoolName}:`, studentError);
        break;
      }
      insertedCount += batch.length;
    }

    console.log(`Successfully created ${insertedCount}/${studentCount} students for "${schoolName}".`);
  }

  console.log("\nFinished generating all dummy schools and students!");
}

run().catch(console.error);
