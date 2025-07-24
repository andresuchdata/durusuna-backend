const { v4: uuidv4 } = require('uuid');

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
      id: uuidv4(),
      name: 'Demo Elementary School',
      address: '123 Education Street, Learning City, LC 12345',
      phone: '+1-555-0123',
      email: 'admin@demo-elementary.edu',
      website: 'https://demo-elementary.edu',
      settings: JSON.stringify({
        timezone: 'America/New_York',
        academic_year: '2024-2025',
        grading_system: 'letter_grades'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: uuidv4(),
      name: 'Demo High School',
      address: '456 Knowledge Avenue, Study Town, ST 67890',
      phone: '+1-555-0124',
      email: 'office@demo-highschool.edu',
      website: 'https://demo-highschool.edu',
      settings: JSON.stringify({
        timezone: 'America/New_York',
        academic_year: '2024-2025',
        grading_system: 'percentage'
      }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
}; 