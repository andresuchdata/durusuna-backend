/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('formula_templates', function (table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('school_id').nullable().references('id').inTable('schools').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.text('description').nullable();
    table.json('visual_structure').notNullable(); // Drag-drop structure
    /*
    visual_structure example:
    {
      "nodes": [
        {
          "id": "node_1",
          "type": "component",
          "component_key": "tugas_harian",
          "display_name": "Tugas Harian",
          "position": {"x": 100, "y": 50}
        },
        {
          "id": "node_2", 
          "type": "operator",
          "operator": "*",
          "value": 0.3,
          "position": {"x": 300, "y": 50}
        },
        {
          "id": "node_3",
          "type": "component", 
          "component_key": "uas",
          "display_name": "UAS",
          "position": {"x": 500, "y": 50}
        }
      ],
      "connections": [
        {"from": "node_1", "to": "node_2"},
        {"from": "node_2", "to": "node_3"}
      ],
      "result_node": "node_3"
    }
    */
    table.text('generated_expression').notNullable(); // Auto-generated math expression
    table.json('validation_rules').defaultTo('{}'); // Validation constraints
    table.enum('category', ['basic', 'islamic', 'advanced', 'custom']).defaultTo('custom');
    table.boolean('is_template').defaultTo(false); // Pre-built template vs user-created
    table.boolean('is_public').defaultTo(false); // Available to other schools
    table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamps(true, true);

    // Indexes
    table.index(['school_id']);
    table.index(['category']);
    table.index(['is_template']);
    table.index(['is_public']);
    table.index(['created_by']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('formula_templates');
};
