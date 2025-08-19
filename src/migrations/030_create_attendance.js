/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.all([
    // School attendance settings
    knex.schema.createTable('school_attendance_settings', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('school_id').references('id').inTable('schools').onDelete('CASCADE').notNullable();
      table.boolean('require_location').defaultTo(false);
      table.decimal('school_latitude', 10, 8).nullable(); // School location coordinates
      table.decimal('school_longitude', 11, 8).nullable();
      table.integer('location_radius_meters').defaultTo(100); // Radius for GPS attendance
      table.json('attendance_hours').defaultTo('{}'); // e.g., {"start": "08:00", "end": "15:00"}
      table.boolean('allow_late_attendance').defaultTo(true);
      table.integer('late_threshold_minutes').defaultTo(15);
      table.timestamps(true, true);
      
      // Indexes
      table.index(['school_id']);
      table.unique(['school_id']); // One setting per school
    }),

    // Daily attendance records
    knex.schema.createTable('attendance_records', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('class_id').references('id').inTable('classes').onDelete('CASCADE').notNullable();
      table.uuid('student_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      table.date('attendance_date').notNullable();
      table.enum('status', ['present', 'absent', 'late', 'excused', 'sick']).notNullable();
      table.time('check_in_time').nullable();
      table.text('notes').nullable(); // Teacher notes
      table.uuid('marked_by').references('id').inTable('users').onDelete('SET NULL').nullable(); // Teacher who marked
      table.enum('marked_via', ['manual', 'gps', 'imported']).defaultTo('manual');
      table.decimal('student_latitude', 10, 8).nullable(); // GPS location when marked by student
      table.decimal('student_longitude', 11, 8).nullable();
      table.boolean('location_verified').defaultTo(false); // If GPS attendance was within school radius
      table.timestamps(true, true);
      
      // Indexes
      table.index(['class_id']);
      table.index(['student_id']);
      table.index(['attendance_date']);
      table.index(['status']);
      table.index(['marked_by']);
      table.index(['marked_via']);
      table.unique(['class_id', 'student_id', 'attendance_date']); // One record per student per day per class
    }),

    // Attendance sessions (for tracking when teachers open attendance)
    knex.schema.createTable('attendance_sessions', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('class_id').references('id').inTable('classes').onDelete('CASCADE').notNullable();
      table.uuid('teacher_id').references('id').inTable('users').onDelete('CASCADE').notNullable();
      table.date('session_date').notNullable();
      table.timestamp('opened_at').defaultTo(knex.fn.now());
      table.timestamp('closed_at').nullable();
      table.boolean('is_finalized').defaultTo(false); // When teacher finalizes attendance
      table.json('settings').defaultTo('{}'); // Session-specific settings
      table.timestamps(true, true);
      
      // Indexes
      table.index(['class_id']);
      table.index(['teacher_id']);
      table.index(['session_date']);
      table.index(['is_finalized']);
    })
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTable('attendance_sessions'),
    knex.schema.dropTable('attendance_records'),
    knex.schema.dropTable('school_attendance_settings')
  ]);
};
