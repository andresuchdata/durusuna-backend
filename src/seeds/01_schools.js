const { v4: uuidv4 } = require('uuid');

// Fixed UUIDs for consistent seeding
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
  await knex('schools').del();
  
  // Inserts seed entries
  await knex('schools').insert([
    {
      id: SCHOOL_IDS.SDIT,
      name: 'SDIT Darel Iman 1',
      address: 'Jl. Khatib Sulaiman No.52, Padang Utara, Kota Padang, Sumatera Barat 25173',
      phone: '+62-751-123456',
      email: 'admin@sditdareliman1.sch.id',
      website: 'https://sditdareliman1.sch.id',
      settings: JSON.stringify({
        timezone: 'Asia/Jakarta',
        academic_year: '2024-2025',
        grading_system: 'percentage',
        attendance_location: {
          name: 'SDIT Darel Iman 1 Campus',
          google_maps_url: 'https://www.google.com/maps',
          latitude: -0.900831,
          longitude: 100.375814,
          radius_meters: 100
        }
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: SCHOOL_IDS.SMP,
      name: 'SMP IT Darel Iman',
      address: 'Jl. Prof. Dr. Hamka No.Air Tawar Tim., Padang Utara, Kota Padang, Sumatera Barat',
      phone: '+62-751-789012',
      email: 'admin@smpitdareliman.sch.id',
      website: 'https://smpitdareliman.sch.id',
      settings: JSON.stringify({
        timezone: 'Asia/Jakarta',
        academic_year: '2024-2025',
        grading_system: 'percentage',
        attendance_location: {
          name: 'SMP IT Darel Iman Campus',
          latitude: -0.900831,
          longitude: 100.375814,
          radius_meters: 100
        }
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  console.log('✅ Schools seeded successfully');
  console.log('   - SDIT Darel Iman 1:', SCHOOL_IDS.SDIT);
  console.log('   - SMP IT Darel Iman:', SCHOOL_IDS.SMP);
};