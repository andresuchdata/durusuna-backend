/**
 * Create grading formulas for each class offering based on formula templates
 * Ensures every class offering has a specific grading formula
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Map assessment group_tags to formula component keys
 */
const COMPONENT_MAPPING = {
  homework: 'tugas_harian',
  assignment: 'ulangan_harian', 
  midterm: 'uts',
  final: 'uas'
};

/**
 * Subject-specific formula variations for Islamic school context
 */
const SUBJECT_FORMULA_VARIATIONS = {
  'Matematika': {
    expression: '0.20 * tugas_harian + 0.30 * ulangan_harian + 0.20 * uts + 0.30 * uas',
    description: 'Matematika: Emphasis on practice and final assessment',
    weights: { homework: 0.20, assignment: 0.30, midterm: 0.20, final: 0.30 }
  },
  'Bahasa Indonesia': {
    expression: '0.25 * tugas_harian + 0.25 * ulangan_harian + 0.20 * uts + 0.30 * uas',
    description: 'Bahasa Indonesia: Balanced assessment with strong final exam',
    weights: { homework: 0.25, assignment: 0.25, midterm: 0.20, final: 0.30 }
  },
  'Bahasa Inggris': {
    expression: '0.30 * tugas_harian + 0.25 * ulangan_harian + 0.20 * uts + 0.25 * uas',
    description: 'Bahasa Inggris: High emphasis on daily practice',
    weights: { homework: 0.30, assignment: 0.25, midterm: 0.20, final: 0.25 }
  },
  'PKN': {
    expression: '0.25 * tugas_harian + 0.25 * ulangan_harian + 0.25 * uts + 0.25 * uas',
    description: 'PKN: Equal weight across all assessment types',
    weights: { homework: 0.25, assignment: 0.25, midterm: 0.25, final: 0.25 }
  },
  'Teknologi Informasi': {
    expression: '0.35 * tugas_harian + 0.30 * ulangan_harian + 0.15 * uts + 0.20 * uas',
    description: 'TI: Heavy emphasis on practical assignments',
    weights: { homework: 0.35, assignment: 0.30, midterm: 0.15, final: 0.20 }
  },
  'Dirosah': {
    expression: '0.20 * tugas_harian + 0.20 * ulangan_harian + 0.25 * uts + 0.35 * uas',
    description: 'Dirosah: Strong emphasis on comprehensive understanding',
    weights: { homework: 0.20, assignment: 0.20, midterm: 0.25, final: 0.35 }
  }
};

/**
 * Islamic school conditional rules
 */
const ISLAMIC_GRADING_CONDITIONS = [
  {
    condition: "uas < 60",
    formula: "uas", 
    description: "If UAS < 60, final grade = UAS score (Islamic education principle)"
  },
  {
    condition: "tugas_harian == null",
    formula: "0.4 * ulangan_harian + 0.25 * uts + 0.35 * uas",
    description: "No homework submitted - adjusted weights"
  }
];

/**
 * Grade boundaries for Islamic schools
 */
const ISLAMIC_GRADE_BOUNDARIES = {
  "A": 90,
  "B": 80, 
  "C": 70,
  "D": 60,
  "F": 0
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  console.log('📐 Creating grading formulas for all class offerings...');
  
  // Delete existing class offering formulas
  await knex('grading_formulas')
    .where('scope', 'class_offering')
    .del();
  
  // Get all class offerings with subject details
  const classOfferings = await knex('class_offerings')
    .join('subjects', 'class_offerings.subject_id', 'subjects.id')
    .join('classes', 'class_offerings.class_id', 'classes.id')
    .join('academic_periods', 'class_offerings.academic_period_id', 'academic_periods.id')
    .where('class_offerings.is_active', true)
    .where('academic_periods.is_current', true)
    .select(
      'class_offerings.id as offering_id',
      'class_offerings.primary_teacher_id',
      'subjects.name as subject_name',
      'classes.name as class_name',
      'academic_periods.name as period_name'
    );

  console.log(`📚 Creating formulas for ${classOfferings.length} class offerings...`);

  const gradingFormulas = [];
  let formulasCreated = 0;

  for (const offering of classOfferings) {
    const subjectFormula = SUBJECT_FORMULA_VARIATIONS[offering.subject_name];
    
    if (!subjectFormula) {
      console.log(`⚠️  No formula variation for subject: ${offering.subject_name}, using default`);
      continue;
    }

    const formulaId = uuidv4();
    
    gradingFormulas.push({
      id: formulaId,
      scope: 'class_offering',
      scope_ref_id: offering.offering_id,
      expression: subjectFormula.expression,
      conditions: JSON.stringify(ISLAMIC_GRADING_CONDITIONS),
      rounding_rule: 'half_up',
      decimal_places: 2,
      pass_threshold: 60.00,
      grade_boundaries: JSON.stringify(ISLAMIC_GRADE_BOUNDARIES),
      version: 1,
      is_active: true,
      description: `${subjectFormula.description} - ${offering.class_name} (${offering.period_name})`,
      created_by: offering.primary_teacher_id,
      created_at: new Date(),
      updated_at: new Date()
    });

    formulasCreated++;
  }

  // Insert grading formulas in batches
  if (gradingFormulas.length > 0) {
    console.log(`📝 Inserting ${gradingFormulas.length} grading formulas...`);
    const batchSize = 50;
    for (let i = 0; i < gradingFormulas.length; i += batchSize) {
      const batch = gradingFormulas.slice(i, i + batchSize);
      await knex('grading_formulas').insert(batch);
    }
  }

  // Generate formula distribution statistics
  const formulasBySubject = {};
  for (const offering of classOfferings) {
    if (SUBJECT_FORMULA_VARIATIONS[offering.subject_name]) {
      formulasBySubject[offering.subject_name] = (formulasBySubject[offering.subject_name] || 0) + 1;
    }
  }

  console.log('✅ Class offering grading formulas created successfully');
  console.log(`   📊 Formula Summary:`);
  console.log(`   - Total formulas created: ${formulasCreated}`);
  console.log(`   - Class offerings covered: ${formulasCreated}/${classOfferings.length}`);
  console.log('   📝 Subject-specific formulas:');
  
  for (const [subject, count] of Object.entries(formulasBySubject)) {
    const formula = SUBJECT_FORMULA_VARIATIONS[subject];
    console.log(`     ${subject}: ${count} classes`);
    console.log(`       Formula: ${formula.expression}`);
    console.log(`       Weights: H(${formula.weights.homework}) A(${formula.weights.assignment}) M(${formula.weights.midterm}) F(${formula.weights.final})`);
  }
  
  console.log('   🎯 Features:');
  console.log('     - Subject-specific weight distributions');
  console.log('     - Islamic school conditional rules (UAS < 60 override)');
  console.log('     - Standard grade boundaries (A:90, B:80, C:70, D:60)');
  console.log('     - Pass threshold: 60 points');
  console.log('     - Precision: 2 decimal places with half-up rounding');
  console.log('   📐 Formula architecture ready for computation engine');
};
