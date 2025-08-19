const { v4: uuidv4 } = require('uuid');

// Fixed UUIDs for consistent seeding - match schools from 01_schools.js
const SCHOOL_IDS = {
  SDIT: '11111111-1111-1111-1111-111111111111',
  SMP: '22222222-2222-2222-2222-222222222222'
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('school_attendance_settings').del();
  
  // Inserts seed entries
  await knex('school_attendance_settings').insert([
    {
      id: uuidv4(),
      school_id: SCHOOL_IDS.SDIT,
      require_location: true,
      school_latitude: -0.900831,  // SDIT Darel Iman 1 location
      school_longitude: 100.375814,
      location_radius_meters: 100,
      attendance_hours: JSON.stringify({
        start: '07:30',
        end: '15:00'
      }),
      allow_late_attendance: true,
      late_threshold_minutes: 15,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      school_id: SCHOOL_IDS.SMP,
      require_location: true,
      school_latitude: -0.901500,  // SMP IT Darel Iman location (slightly different)
      school_longitude: 100.376000,
      location_radius_meters: 150,
      attendance_hours: JSON.stringify({
        start: '07:00',
        end: '15:30'
      }),
      allow_late_attendance: true,
      late_threshold_minutes: 10,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  console.log('✅ School attendance settings seeded successfully');
  console.log('   - SDIT settings: Location required, 100m radius');
  console.log('   - SMP settings: Location required, 150m radius');
};
