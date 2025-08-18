/**
 * Islamic School Formula Templates for Drag-Drop UI
 */

exports.seed = async function(knex) {
  // Get first school for seeding
  const [school] = await knex('schools').select('id').limit(1);
  if (!school) {
    console.log('No schools found, skipping formula templates seed');
    return;
  }

  // Get admin user
  const [admin] = await knex('users').select('id').where({ user_type: 'admin' }).limit(1);
  if (!admin) {
    console.log('No admin user found, skipping formula templates seed');
    return;
  }

  // Basic Weighted Formula Template
  const basicWeightedTemplate = {
    id: knex.raw('gen_random_uuid()'),
    school_id: school.id,
    name: 'Basic Weighted Formula',
    description: 'Standard Islamic school grading: 25% Tugas Harian + 25% Ulangan Harian + 20% UTS + 30% UAS',
    visual_structure: JSON.stringify({
      nodes: [
        {
          id: 'tugas_harian_comp',
          type: 'component',
          position: { x: 50, y: 100 },
          data: {
            component_key: 'tugas_harian',
            display_name: 'Tugas Harian',
            source_type: 'assignment',
            color: 0xFF4CAF50,
            icon: 0xe8b8, // Icons.assignment
            description: 'Average of daily assignments'
          }
        },
        {
          id: 'tugas_weight',
          type: 'value',
          position: { x: 180, y: 100 },
          data: {
            value: 0.25,
            display_value: '25%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        },
        {
          id: 'mult1',
          type: 'operator',
          position: { x: 280, y: 100 },
          data: {
            operator: '*',
            display_symbol: '×',
            precedence: 2,
            color: 0xFF795548
          }
        },
        {
          id: 'ulangan_comp',
          type: 'component',
          position: { x: 50, y: 200 },
          data: {
            component_key: 'ulangan_harian',
            display_name: 'Ulangan Harian',
            source_type: 'test',
            color: 0xFF2196F3,
            icon: 0xe8dc, // Icons.quiz
            description: 'Average of regular tests'
          }
        },
        {
          id: 'ulangan_weight',
          type: 'value',
          position: { x: 180, y: 200 },
          data: {
            value: 0.25,
            display_value: '25%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        },
        {
          id: 'mult2',
          type: 'operator',
          position: { x: 280, y: 200 },
          data: {
            operator: '*',
            display_symbol: '×',
            precedence: 2,
            color: 0xFF795548
          }
        },
        {
          id: 'uts_comp',
          type: 'component',
          position: { x: 50, y: 300 },
          data: {
            component_key: 'uts',
            display_name: 'UTS',
            source_type: 'test',
            color: 0xFFFF9800,
            icon: 0xe80c, // Icons.school
            description: 'Mid-semester exam'
          }
        },
        {
          id: 'uts_weight',
          type: 'value',
          position: { x: 180, y: 300 },
          data: {
            value: 0.20,
            display_value: '20%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        },
        {
          id: 'mult3',
          type: 'operator',
          position: { x: 280, y: 300 },
          data: {
            operator: '*',
            display_symbol: '×',
            precedence: 2,
            color: 0xFF795548
          }
        },
        {
          id: 'uas_comp',
          type: 'component',
          position: { x: 50, y: 400 },
          data: {
            component_key: 'uas',
            display_name: 'UAS',
            source_type: 'final_exam',
            color: 0xFFF44336,
            icon: 0xe8cc, // Icons.bookmark
            description: 'Final semester exam'
          }
        },
        {
          id: 'uas_weight',
          type: 'value',
          position: { x: 180, y: 400 },
          data: {
            value: 0.30,
            display_value: '30%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        },
        {
          id: 'mult4',
          type: 'operator',
          position: { x: 280, y: 400 },
          data: {
            operator: '*',
            display_symbol: '×',
            precedence: 2,
            color: 0xFF795548
          }
        },
        {
          id: 'add1',
          type: 'operator',
          position: { x: 400, y: 150 },
          data: {
            operator: '+',
            display_symbol: '+',
            precedence: 1,
            color: 0xFF795548
          }
        },
        {
          id: 'add2',
          type: 'operator',
          position: { x: 500, y: 250 },
          data: {
            operator: '+',
            display_symbol: '+',
            precedence: 1,
            color: 0xFF795548
          }
        },
        {
          id: 'add3',
          type: 'operator',
          position: { x: 600, y: 350 },
          data: {
            operator: '+',
            display_symbol: '+',
            precedence: 1,
            color: 0xFF795548
          }
        }
      ],
      connections: [
        { id: 'conn1', from_node: 'tugas_harian_comp', to_node: 'mult1', connection_type: 'flow' },
        { id: 'conn2', from_node: 'tugas_weight', to_node: 'mult1', connection_type: 'flow' },
        { id: 'conn3', from_node: 'ulangan_comp', to_node: 'mult2', connection_type: 'flow' },
        { id: 'conn4', from_node: 'ulangan_weight', to_node: 'mult2', connection_type: 'flow' },
        { id: 'conn5', from_node: 'uts_comp', to_node: 'mult3', connection_type: 'flow' },
        { id: 'conn6', from_node: 'uts_weight', to_node: 'mult3', connection_type: 'flow' },
        { id: 'conn7', from_node: 'uas_comp', to_node: 'mult4', connection_type: 'flow' },
        { id: 'conn8', from_node: 'uas_weight', to_node: 'mult4', connection_type: 'flow' },
        { id: 'conn9', from_node: 'mult1', to_node: 'add1', connection_type: 'flow' },
        { id: 'conn10', from_node: 'mult2', to_node: 'add1', connection_type: 'flow' },
        { id: 'conn11', from_node: 'add1', to_node: 'add2', connection_type: 'flow' },
        { id: 'conn12', from_node: 'mult3', to_node: 'add2', connection_type: 'flow' },
        { id: 'conn13', from_node: 'add2', to_node: 'add3', connection_type: 'flow' },
        { id: 'conn14', from_node: 'mult4', to_node: 'add3', connection_type: 'flow' }
      ],
      result_node_id: 'add3',
      canvas_settings: {
        width: 800,
        height: 600,
        zoom: 1.0,
        grid_size: 20,
        snap_to_grid: true,
        background_color: 0xFFFFFFFF
      }
    }),
    generated_expression: '0.25 * tugas_harian + 0.25 * ulangan_harian + 0.20 * uts + 0.30 * uas',
    validation_rules: JSON.stringify({
      required_components: ['tugas_harian', 'ulangan_harian', 'uts', 'uas'],
      require_final_exam: true,
      min_weight_sum: 0.99,
      max_weight_sum: 1.01
    }),
    category: 'islamic',
    is_template: true,
    is_public: true,
    created_by: admin.id
  };

  // UAS Dominant Formula Template (with condition)
  const uasDominantTemplate = {
    id: knex.raw('gen_random_uuid()'),
    school_id: school.id,
    name: 'UAS Dominant Formula',
    description: 'If UAS < 60, final grade = UAS. Otherwise use weighted formula.',
    visual_structure: JSON.stringify({
      nodes: [
        {
          id: 'condition_if',
          type: 'condition',
          position: { x: 50, y: 50 },
          data: {
            condition_type: 'if',
            condition_expression: 'uas < 60',
            display_text: 'IF UAS < 60',
            color: 0xFFFF5722
          }
        },
        {
          id: 'uas_alone',
          type: 'component',
          position: { x: 200, y: 100 },
          data: {
            component_key: 'uas',
            display_name: 'UAS',
            source_type: 'final_exam',
            color: 0xFFF44336,
            icon: 0xe8cc,
            description: 'Final exam score only'
          }
        },
        {
          id: 'condition_else',
          type: 'condition',
          position: { x: 50, y: 200 },
          data: {
            condition_type: 'else',
            display_text: 'ELSE',
            color: 0xFFFF5722
          }
        },
        {
          id: 'weighted_formula',
          type: 'component',
          position: { x: 200, y: 250 },
          data: {
            component_key: 'weighted_average',
            display_name: 'Weighted Average',
            source_type: 'assignment',
            color: 0xFF4CAF50,
            icon: 0xe8b8,
            description: 'Standard weighted calculation'
          }
        }
      ],
      connections: [
        { id: 'conn1', from_node: 'condition_if', to_node: 'uas_alone', connection_type: 'condition_true' },
        { id: 'conn2', from_node: 'condition_else', to_node: 'weighted_formula', connection_type: 'condition_true' }
      ],
      result_node_id: 'weighted_formula',
      canvas_settings: {
        width: 600,
        height: 400,
        zoom: 1.0,
        grid_size: 20,
        snap_to_grid: true,
        background_color: 0xFFFFFFFF
      }
    }),
    generated_expression: 'IF(uas < 60, uas, 0.25 * tugas_harian + 0.25 * ulangan_harian + 0.20 * uts + 0.30 * uas)',
    validation_rules: JSON.stringify({
      required_components: ['uas'],
      require_final_exam: true,
      custom_rules: [
        {
          rule_type: 'expression_complexity',
          parameters: { max_conditions: 1 },
          error_message: 'Template supports one condition only'
        }
      ]
    }),
    category: 'islamic',
    is_template: true,
    is_public: true,
    created_by: admin.id
  };

  // Best Tests Formula Template
  const bestTestsTemplate = {
    id: knex.raw('gen_random_uuid()'),
    school_id: school.id,
    name: 'Best Tests Formula',
    description: 'Take best 2 out of 3 pengulangan tests + assignments + UAS',
    visual_structure: JSON.stringify({
      nodes: [
        {
          id: 'tugas_comp',
          type: 'component',
          position: { x: 50, y: 100 },
          data: {
            component_key: 'tugas_harian',
            display_name: 'Tugas Harian',
            source_type: 'assignment',
            color: 0xFF4CAF50,
            icon: 0xe8b8,
            description: 'All assignments average'
          }
        },
        {
          id: 'tugas_weight',
          type: 'value',
          position: { x: 180, y: 100 },
          data: {
            value: 0.30,
            display_value: '30%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        },
        {
          id: 'mult1',
          type: 'operator',
          position: { x: 280, y: 100 },
          data: {
            operator: '*',
            display_symbol: '×',
            precedence: 2,
            color: 0xFF795548
          }
        },
        {
          id: 'best_tests_comp',
          type: 'component',
          position: { x: 50, y: 200 },
          data: {
            component_key: 'pengulangan_best_2',
            display_name: 'Best 2 Tests',
            source_type: 'test',
            color: 0xFF2196F3,
            icon: 0xe8dc,
            description: 'Best 2 out of 3 pengulangan'
          }
        },
        {
          id: 'tests_weight',
          type: 'value',
          position: { x: 180, y: 200 },
          data: {
            value: 0.35,
            display_value: '35%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        },
        {
          id: 'mult2',
          type: 'operator',
          position: { x: 280, y: 200 },
          data: {
            operator: '*',
            display_symbol: '×',
            precedence: 2,
            color: 0xFF795548
          }
        },
        {
          id: 'uas_comp',
          type: 'component',
          position: { x: 50, y: 300 },
          data: {
            component_key: 'uas',
            display_name: 'UAS',
            source_type: 'final_exam',
            color: 0xFFF44336,
            icon: 0xe8cc,
            description: 'Final semester exam'
          }
        },
        {
          id: 'uas_weight',
          type: 'value',
          position: { x: 180, y: 300 },
          data: {
            value: 0.35,
            display_value: '35%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        },
        {
          id: 'mult3',
          type: 'operator',
          position: { x: 280, y: 300 },
          data: {
            operator: '*',
            display_symbol: '×',
            precedence: 2,
            color: 0xFF795548
          }
        },
        {
          id: 'add1',
          type: 'operator',
          position: { x: 400, y: 150 },
          data: {
            operator: '+',
            display_symbol: '+',
            precedence: 1,
            color: 0xFF795548
          }
        },
        {
          id: 'add2',
          type: 'operator',
          position: { x: 500, y: 250 },
          data: {
            operator: '+',
            display_symbol: '+',
            precedence: 1,
            color: 0xFF795548
          }
        }
      ],
      connections: [
        { id: 'conn1', from_node: 'tugas_comp', to_node: 'mult1', connection_type: 'flow' },
        { id: 'conn2', from_node: 'tugas_weight', to_node: 'mult1', connection_type: 'flow' },
        { id: 'conn3', from_node: 'best_tests_comp', to_node: 'mult2', connection_type: 'flow' },
        { id: 'conn4', from_node: 'tests_weight', to_node: 'mult2', connection_type: 'flow' },
        { id: 'conn5', from_node: 'uas_comp', to_node: 'mult3', connection_type: 'flow' },
        { id: 'conn6', from_node: 'uas_weight', to_node: 'mult3', connection_type: 'flow' },
        { id: 'conn7', from_node: 'mult1', to_node: 'add1', connection_type: 'flow' },
        { id: 'conn8', from_node: 'mult2', to_node: 'add1', connection_type: 'flow' },
        { id: 'conn9', from_node: 'add1', to_node: 'add2', connection_type: 'flow' },
        { id: 'conn10', from_node: 'mult3', to_node: 'add2', connection_type: 'flow' }
      ],
      result_node_id: 'add2',
      canvas_settings: {
        width: 700,
        height: 500,
        zoom: 1.0,
        grid_size: 20,
        snap_to_grid: true,
        background_color: 0xFFFFFFFF
      }
    }),
    generated_expression: '0.30 * tugas_harian + 0.35 * BEST_N(pengulangan, 2) + 0.35 * uas',
    validation_rules: JSON.stringify({
      required_components: ['tugas_harian', 'pengulangan_best_2', 'uas'],
      require_final_exam: true,
      min_weight_sum: 0.99,
      max_weight_sum: 1.01
    }),
    category: 'islamic',
    is_template: true,
    is_public: true,
    created_by: admin.id
  };

  // Progressive Weight Formula (increasing through semester)
  const progressiveTemplate = {
    id: knex.raw('gen_random_uuid()'),
    school_id: school.id,
    name: 'Progressive Weight Formula',
    description: 'Increasing weights: 15% Tugas + 20% Ulangan + 25% UTS + 40% UAS',
    visual_structure: JSON.stringify({
      nodes: [
        {
          id: 'tugas_comp',
          type: 'component',
          position: { x: 50, y: 80 },
          data: {
            component_key: 'tugas_harian',
            display_name: 'Tugas Harian',
            source_type: 'assignment',
            color: 0xFF4CAF50,
            icon: 0xe8b8,
            description: 'Lowest weight - early semester'
          }
        },
        {
          id: 'tugas_weight',
          type: 'value',
          position: { x: 180, y: 80 },
          data: {
            value: 0.15,
            display_value: '15%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        },
        {
          id: 'ulangan_comp',
          type: 'component',
          position: { x: 50, y: 160 },
          data: {
            component_key: 'ulangan_harian',
            display_name: 'Ulangan Harian',
            source_type: 'test',
            color: 0xFF2196F3,
            icon: 0xe8dc,
            description: 'Regular tests - moderate weight'
          }
        },
        {
          id: 'ulangan_weight',
          type: 'value',
          position: { x: 180, y: 160 },
          data: {
            value: 0.20,
            display_value: '20%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        },
        {
          id: 'uts_comp',
          type: 'component',
          position: { x: 50, y: 240 },
          data: {
            component_key: 'uts',
            display_name: 'UTS',
            source_type: 'test',
            color: 0xFFFF9800,
            icon: 0xe80c,
            description: 'Mid-semester - higher weight'
          }
        },
        {
          id: 'uts_weight',
          type: 'value',
          position: { x: 180, y: 240 },
          data: {
            value: 0.25,
            display_value: '25%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        },
        {
          id: 'uas_comp',
          type: 'component',
          position: { x: 50, y: 320 },
          data: {
            component_key: 'uas',
            display_name: 'UAS',
            source_type: 'final_exam',
            color: 0xFFF44336,
            icon: 0xe8cc,
            description: 'Final exam - highest weight'
          }
        },
        {
          id: 'uas_weight',
          type: 'value',
          position: { x: 180, y: 320 },
          data: {
            value: 0.40,
            display_value: '40%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        }
      ],
      connections: [
        // Simplified visual - actual computation handled by backend
      ],
      result_node_id: 'uas_comp',
      canvas_settings: {
        width: 600,
        height: 450,
        zoom: 1.0,
        grid_size: 20,
        snap_to_grid: true,
        background_color: 0xFFFFFFFF
      }
    }),
    generated_expression: '0.15 * tugas_harian + 0.20 * ulangan_harian + 0.25 * uts + 0.40 * uas',
    validation_rules: JSON.stringify({
      required_components: ['tugas_harian', 'ulangan_harian', 'uts', 'uas'],
      require_final_exam: true,
      min_weight_sum: 0.99,
      max_weight_sum: 1.01,
      custom_rules: [
        {
          rule_type: 'weight_range',
          parameters: { min_final_weight: 0.35 },
          error_message: 'Final exam should have significant weight (>35%)'
        }
      ]
    }),
    category: 'islamic',
    is_template: true,
    is_public: true,
    created_by: admin.id
  };

  // Tahfidz Special Formula Template
  const tahfidzTemplate = {
    id: knex.raw('gen_random_uuid()'),
    school_id: school.id,
    name: 'Tahfidz Special Formula',
    description: 'Special weighting for Quran memorization subjects',
    visual_structure: JSON.stringify({
      nodes: [
        {
          id: 'hafalan_comp',
          type: 'component',
          position: { x: 50, y: 100 },
          data: {
            component_key: 'hafalan',
            display_name: 'Hafalan',
            source_type: 'assignment',
            color: 0xFF9C27B0,
            icon: 0xe8fb, // Icons.book
            description: 'Quran memorization scores'
          }
        },
        {
          id: 'hafalan_weight',
          type: 'value',
          position: { x: 180, y: 100 },
          data: {
            value: 0.40,
            display_value: '40%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        },
        {
          id: 'bacaan_comp',
          type: 'component',
          position: { x: 50, y: 200 },
          data: {
            component_key: 'bacaan',
            display_name: 'Bacaan',
            source_type: 'test',
            color: 0xFF607D8B,
            icon: 0xe8dc,
            description: 'Quran recitation tests'
          }
        },
        {
          id: 'bacaan_weight',
          type: 'value',
          position: { x: 180, y: 200 },
          data: {
            value: 0.30,
            display_value: '30%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        },
        {
          id: 'uas_comp',
          type: 'component',
          position: { x: 50, y: 300 },
          data: {
            component_key: 'uas',
            display_name: 'UAS',
            source_type: 'final_exam',
            color: 0xFFF44336,
            icon: 0xe8cc,
            description: 'Final written exam'
          }
        },
        {
          id: 'uas_weight',
          type: 'value',
          position: { x: 180, y: 300 },
          data: {
            value: 0.30,
            display_value: '30%',
            is_percentage: true,
            is_weight: true,
            color: 0xFF009688
          }
        }
      ],
      connections: [
        // Simplified connections - actual logic in backend
      ],
      result_node_id: 'uas_comp',
      canvas_settings: {
        width: 500,
        height: 400,
        zoom: 1.0,
        grid_size: 20,
        snap_to_grid: true,
        background_color: 0xFFFFFFFF
      }
    }),
    generated_expression: '0.40 * hafalan + 0.30 * bacaan + 0.30 * uas',
    validation_rules: JSON.stringify({
      required_components: ['hafalan', 'bacaan', 'uas'],
      require_final_exam: true,
      custom_rules: [
        {
          rule_type: 'component_count',
          parameters: { min_hafalan_weight: 0.35 },
          error_message: 'Hafalan should be primary component for Tahfidz subjects'
        }
      ]
    }),
    category: 'islamic',
    is_template: true,
    is_public: true,
    created_by: admin.id
  };

  // Insert all templates
  await knex('formula_templates').insert([
    basicWeightedTemplate,
    uasDominantTemplate,
    bestTestsTemplate,
    progressiveTemplate,
    tahfidzTemplate
  ]);

  console.log(`Created ${5} Islamic school formula templates:
    - Basic Weighted Formula
    - UAS Dominant Formula  
    - Best Tests Formula
    - Progressive Weight Formula
    - Tahfidz Special Formula
  `);
};
