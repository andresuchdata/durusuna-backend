exports.up = function(knex) {
  return knex.schema
    .createTable('schedule_templates', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table
        .uuid('class_subject_id')
        .notNullable()
        .references('id')
        .inTable('class_subjects')
        .onDelete('CASCADE');
      table.string('name', 150).notNullable();
      table.date('effective_from').notNullable();
      table.date('effective_to');
      table.string('timezone', 50).defaultTo('UTC');
      table
        .uuid('created_by')
        .references('id')
        .inTable('users')
        .onDelete('SET NULL');
      table.timestamps(true, true);

      table.unique(['class_subject_id', 'effective_from']);
      table.index(['class_subject_id']);
      table.index(['effective_from']);
      table.index(['effective_to']);
    })
    .then(() =>
      knex.schema.createTable('schedule_template_slots', function(table) {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table
          .uuid('template_id')
          .notNullable()
          .references('id')
          .inTable('schedule_templates')
          .onDelete('CASCADE');
        table.integer('weekday').notNullable(); // 0 (Sunday) - 6 (Saturday)
        table.time('start_time').notNullable();
        table.time('end_time').notNullable();
        table.string('room', 50);
        table.json('metadata').defaultTo('{}');
        table.timestamps(true, true);

        table.index(['template_id']);
        table.index(['weekday']);
        table.index(['start_time']);
      })
    )
    .then(() =>
      knex.schema.createTable('lesson_instances', function(table) {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table
          .uuid('class_subject_id')
          .notNullable()
          .references('id')
          .inTable('class_subjects')
          .onDelete('CASCADE');
        table
          .uuid('schedule_slot_id')
          .references('id')
          .inTable('schedule_template_slots')
          .onDelete('SET NULL');
        table.timestamp('scheduled_start').notNullable();
        table.timestamp('scheduled_end').notNullable();
        table.timestamp('actual_start');
        table.timestamp('actual_end');
        table
          .enum('status', ['planned', 'in_session', 'completed', 'cancelled'])
          .defaultTo('planned');
        table.string('title', 255);
        table.text('description');
        table.json('objectives').defaultTo('[]');
        table.json('materials').defaultTo('[]');
        table.text('notes');
        table.text('cancellation_reason');
        table
          .uuid('created_by')
          .references('id')
          .inTable('users')
          .onDelete('SET NULL');
        table
          .uuid('updated_by')
          .references('id')
          .inTable('users')
          .onDelete('SET NULL');
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);

        table.index(['class_subject_id']);
        table.index(['schedule_slot_id']);
        table.index(['scheduled_start']);
        table.index(['status']);
        table.index(['is_active']);
      })
    );
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('lesson_instances')
    .then(() => knex.schema.dropTableIfExists('schedule_template_slots'))
    .then(() => knex.schema.dropTableIfExists('schedule_templates'));
};