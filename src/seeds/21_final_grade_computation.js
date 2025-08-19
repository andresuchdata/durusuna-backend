/**
 * Final Grade Computation Seed  
 * Computes semester grades based on assessment data using grading formulas
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Component key mapping from assessment group_tag to formula variables
 */
const COMPONENT_MAPPING = {
  homework: 'tugas_harian',
  assignment: 'ulangan_harian', 
  midterm: 'uts',
  final: 'uas'
};

/**
 * Calculate final grade using the specific grading formula for the class offering
 */
function calculateFinalGradeWithFormula(assessmentGrades, gradingFormula) {
  // Group grades by type and calculate averages
  const gradesByType = assessmentGrades.reduce((acc, grade) => {
    if (!acc[grade.type]) acc[grade.type] = [];
    acc[grade.type].push(grade.adjusted_score);
    return acc;
  }, {});

  // Calculate component averages and map to formula variables
  const components = {};
  const formulaVariables = {};
  
  for (const [assessmentType, scores] of Object.entries(gradesByType)) {
    if (scores.length > 0) {
      // Convert string scores to numbers before calculating average
      const numericScores = scores.map(score => parseFloat(score) || 0);
      const average = numericScores.reduce((sum, score) => sum + score, 0) / numericScores.length;
      const componentKey = COMPONENT_MAPPING[assessmentType] || assessmentType;
      
      components[`${assessmentType}_avg`] = average;
      formulaVariables[componentKey] = average;
    }
  }

  // Check conditional rules first
  let conditions = [];
  try {
    // Handle both JSON string and already parsed object
    if (typeof gradingFormula.conditions === 'string') {
      conditions = JSON.parse(gradingFormula.conditions);
    } else if (Array.isArray(gradingFormula.conditions)) {
      conditions = gradingFormula.conditions;
    } else {
      conditions = [];
    }
  } catch (error) {
    console.warn(`❌ Error parsing conditions:`, error.message);
    conditions = [];
  }
  
  for (const condition of conditions) {
    if (evaluateCondition(condition.condition, formulaVariables)) {
      const conditionalGrade = evaluateFormula(condition.formula, formulaVariables);
      return {
        numericGrade: roundGrade(conditionalGrade, gradingFormula),
        letterGrade: getLetterGrade(conditionalGrade, gradingFormula),
        isPassing: conditionalGrade >= (gradingFormula.pass_threshold || 60),
        components,
        formula: `${condition.description}: ${condition.formula}`,
        appliedRule: condition.description
      };
    }
  }

  // Apply main formula if no conditions triggered
  const finalGrade = evaluateFormula(gradingFormula.expression, formulaVariables);
  
  return {
    numericGrade: roundGrade(finalGrade, gradingFormula),
    letterGrade: getLetterGrade(finalGrade, gradingFormula),
    isPassing: finalGrade >= (gradingFormula.pass_threshold || 60),
    components,
    formula: gradingFormula.expression,
    appliedRule: 'standard'
  };
}

/**
 * Evaluate a conditional expression
 */
function evaluateCondition(condition, variables) {
  try {
    // Simple condition evaluation - extend as needed
    // Support: variable < value, variable > value, variable == null
    if (condition.includes(' < ')) {
      const [varName, value] = condition.split(' < ').map(s => s.trim());
      return (variables[varName] || 0) < parseFloat(value);
    }
    if (condition.includes(' > ')) {
      const [varName, value] = condition.split(' > ').map(s => s.trim());
      return (variables[varName] || 0) > parseFloat(value);
    }
    if (condition.includes(' == null')) {
      const varName = condition.replace(' == null', '').trim();
      return variables[varName] === undefined || variables[varName] === null;
    }
    return false;
  } catch (error) {
    console.warn(`Error evaluating condition "${condition}":`, error.message);
    return false;
  }
}

/**
 * Evaluate a mathematical formula expression
 */
function evaluateFormula(expression, variables) {
  try {
    // Replace variables in expression with actual values
    let processedExpression = expression;
    
    for (const [varName, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\b${varName}\\b`, 'g');
      const numericValue = (value !== undefined && value !== null) ? Number(value) : 0;
      processedExpression = processedExpression.replace(regex, numericValue);
    }
    
    // Validate the processed expression contains only numbers, operators, and parentheses
    if (!/^[0-9+\-*/.() ]+$/.test(processedExpression)) {
      throw new Error(`Invalid expression after variable substitution: ${processedExpression}`);
    }
    
    // Basic math evaluation using eval (safer than Function constructor in this context)
    const result = eval(processedExpression);
    
    return isNaN(result) ? 0 : result;
  } catch (error) {
    console.warn(`❌ Error evaluating formula "${expression}":`, error.message);
    console.warn(`   Variables:`, JSON.stringify(variables, null, 2));
    return 0;
  }
}

/**
 * Round grade according to formula rules
 */
function roundGrade(grade, gradingFormula) {
  const places = gradingFormula.decimal_places || 2;
  const rule = gradingFormula.rounding_rule || 'half_up';
  
  const multiplier = Math.pow(10, places);
  
  switch (rule) {
    case 'half_up':
      return Math.round(grade * multiplier) / multiplier;
    case 'half_down':
      return Math.floor(grade * multiplier + 0.5) / multiplier;
    case 'floor':
      return Math.floor(grade * multiplier) / multiplier;
    case 'ceil':
      return Math.ceil(grade * multiplier) / multiplier;
    default:
      return Math.round(grade * multiplier) / multiplier;
  }
}

/**
 * Get letter grade based on boundaries
 */
function getLetterGrade(numericGrade, gradingFormula) {
  let boundaries;
  try {
    // Handle both JSON string and already parsed object
    if (typeof gradingFormula.grade_boundaries === 'string') {
      boundaries = JSON.parse(gradingFormula.grade_boundaries);
    } else if (typeof gradingFormula.grade_boundaries === 'object' && gradingFormula.grade_boundaries !== null) {
      boundaries = gradingFormula.grade_boundaries;
    } else {
      boundaries = { "A": 90, "B": 80, "C": 70, "D": 60, "F": 0 };
    }
  } catch (error) {
    console.warn(`❌ Error parsing grade boundaries:`, error.message);
    console.warn(`   Raw boundaries:`, gradingFormula.grade_boundaries);
    boundaries = { "A": 90, "B": 80, "C": 70, "D": 60, "F": 0 };
  }
  
  // Sort boundaries by threshold descending
  const sortedBoundaries = Object.entries(boundaries).sort((a, b) => b[1] - a[1]);
  
  for (const [letter, threshold] of sortedBoundaries) {
    if (numericGrade >= threshold) {
      return letter;
    }
  }
  return 'F';
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  console.log('🧮 Computing final grades for Semester 1...');
  
  // Delete existing final grades
  await knex('final_grades').del();
  
  // Get current academic period
  const academicPeriod = await knex('academic_periods')
    .where('is_current', true)
    .where('type', 'semester')
    .first();
    
  if (!academicPeriod) {
    console.log('❌ No current academic period found');
    return;
  }

  // Get all enrollments with their assessment grades and grading formulas
  const enrollments = await knex('enrollments')
    .join('class_offerings', 'enrollments.class_offering_id', 'class_offerings.id')
    .join('subjects', 'class_offerings.subject_id', 'subjects.id')
    .join('classes', 'class_offerings.class_id', 'classes.id')
    .join('users', 'enrollments.student_id', 'users.id')
    .leftJoin('grading_formulas', function() {
      this.on('grading_formulas.scope_ref_id', '=', 'class_offerings.id')
          .andOn('grading_formulas.scope', '=', knex.raw('?', ['class_offering']))
          .andOn('grading_formulas.is_active', '=', knex.raw('?', [true]));
    })
    .where('enrollments.status', 'active')
    .where('class_offerings.academic_period_id', academicPeriod.id)
    .select(
      'enrollments.student_id',
      'enrollments.class_offering_id',
      'subjects.name as subject_name',
      'classes.name as class_name',
      'users.first_name',
      'users.last_name',
      'grading_formulas.id as formula_id',
      'grading_formulas.expression as formula_expression',
      'grading_formulas.conditions as formula_conditions',
      'grading_formulas.pass_threshold',
      'grading_formulas.grade_boundaries',
      'grading_formulas.decimal_places',
      'grading_formulas.rounding_rule'
    );

  console.log(`📊 Computing grades for ${enrollments.length} student-subject enrollments...`);

  const finalGrades = [];
  const gradeComputations = [];
  let successCount = 0;
  let errorCount = 0;

  for (const enrollment of enrollments) {
    try {
      // Check if grading formula exists for this class offering
      if (!enrollment.formula_id) {
        console.log(`⚠️  No grading formula found for ${enrollment.subject_name} - ${enrollment.class_name}, skipping`);
        errorCount++;
        continue;
      }

      // Get all assessment grades for this student-offering combination
      const assessmentGrades = await knex('assessment_grades')
        .join('assessments', 'assessment_grades.assessment_id', 'assessments.id')
        .where('assessment_grades.student_id', enrollment.student_id)
        .where('assessments.class_offering_id', enrollment.class_offering_id)
        .where('assessment_grades.status', 'graded')
        .select(
          'assessment_grades.adjusted_score',
          'assessments.group_tag as type', // Use group_tag as type for categorization
          'assessments.weight_override as weight',
          'assessments.title'
        );

      if (assessmentGrades.length === 0) {
        console.log(`⚠️  No grades found for ${enrollment.first_name} ${enrollment.last_name} in ${enrollment.subject_name}`);
        continue;
      }

      // Prepare grading formula object
      const gradingFormula = {
        id: enrollment.formula_id,
        expression: enrollment.formula_expression,
        conditions: enrollment.formula_conditions,
        pass_threshold: enrollment.pass_threshold,
        grade_boundaries: enrollment.grade_boundaries,
        decimal_places: enrollment.decimal_places,
        rounding_rule: enrollment.rounding_rule
      };

      // Calculate final grade using the specific formula
      const gradeResult = calculateFinalGradeWithFormula(assessmentGrades, gradingFormula);
      
      const finalGradeId = uuidv4();
      const computationTime = new Date();
      
      // Create final grade record
      finalGrades.push({
        id: finalGradeId,
        student_id: enrollment.student_id,
        class_offering_id: enrollment.class_offering_id,
        numeric_grade: gradeResult.numericGrade,
        letter_grade: gradeResult.letterGrade,
        is_passing: gradeResult.isPassing,
        component_breakdown: JSON.stringify({
          ...gradeResult.components,
          formula_used: gradeResult.formula,
          applied_rule: gradeResult.appliedRule,
          assessment_count: assessmentGrades.length,
          computation_date: computationTime.toISOString(),
          formula_id: enrollment.formula_id
        }),
        formula_id: enrollment.formula_id,
        computed_at: computationTime,
        computed_by: null, // System computation
        is_published: true, // Auto-publish for semester end
        published_at: computationTime,
        is_locked: false,
        created_at: computationTime,
        updated_at: computationTime
      });

      // Create computation audit log with correct structure
      gradeComputations.push({
        id: uuidv4(),
        final_grade_id: finalGradeId,
        triggered_by: null, // System triggered
        trigger_type: 'auto_assessment_change',
        trigger_description: 'Semester final grade computation',
        previous_grade: null, // First computation
        new_grade: gradeResult.numericGrade,
        computation_log: JSON.stringify({
          formula: gradeResult.formula,
          applied_rule: gradeResult.appliedRule,
          components: gradeResult.components,
          assessment_grades: assessmentGrades.map(g => ({
            type: g.type,
            score: g.adjusted_score,
            title: g.title
          })),
          computation_steps: [
            `Input assessments: ${assessmentGrades.length}`,
            `Formula applied: ${gradeResult.formula}`,
            `Rule applied: ${gradeResult.appliedRule}`,
            `Final grade: ${gradeResult.numericGrade} (${gradeResult.letterGrade})`
          ]
        }),
        status: 'completed',
        error_message: null,
        started_at: computationTime,
        completed_at: computationTime,
        created_at: computationTime,
        updated_at: computationTime
      });

      successCount++;
    } catch (error) {
      console.error(`❌ Error computing grade for ${enrollment.first_name} ${enrollment.last_name} in ${enrollment.subject_name}:`, error.message);
      
      // Create failed computation log
      const computationTime = new Date();
      gradeComputations.push({
        id: uuidv4(),
        final_grade_id: null,
        triggered_by: null,
        trigger_type: 'auto_assessment_change',
        trigger_description: `Failed computation for ${enrollment.first_name} ${enrollment.last_name}`,
        previous_grade: null,
        new_grade: null,
        computation_log: JSON.stringify({
          error: error.message,
          enrollment: {
            student: `${enrollment.first_name} ${enrollment.last_name}`,
            subject: enrollment.subject_name,
            class: enrollment.class_name
          }
        }),
        status: 'failed',
        error_message: error.message,
        started_at: computationTime,
        completed_at: computationTime,
        created_at: computationTime,
        updated_at: computationTime
      });
      
      errorCount++;
    }
  }

  // Insert final grades in batches
  if (finalGrades.length > 0) {
    console.log(`📝 Inserting ${finalGrades.length} final grades...`);
    const batchSize = 50;
    for (let i = 0; i < finalGrades.length; i += batchSize) {
      const batch = finalGrades.slice(i, i + batchSize);
      await knex('final_grades').insert(batch);
    }
  }

  // Insert computation logs
  if (gradeComputations.length > 0) {
    console.log(`📋 Inserting ${gradeComputations.length} computation logs...`);
    const batchSize = 50;
    for (let i = 0; i < gradeComputations.length; i += batchSize) {
      const batch = gradeComputations.slice(i, i + batchSize);
      await knex('grade_computations').insert(batch);
    }
  }

  // Generate grade distribution statistics
  const gradeDistribution = finalGrades.reduce((acc, grade) => {
    acc[grade.letter_grade] = (acc[grade.letter_grade] || 0) + 1;
    return acc;
  }, {});

  const averageGrade = finalGrades.length > 0 ? 
    finalGrades.reduce((sum, grade) => sum + grade.numeric_grade, 0) / finalGrades.length : 0;

  const passingCount = finalGrades.filter(g => g.is_passing).length;
  const passingRate = finalGrades.length > 0 ? (passingCount / finalGrades.length * 100) : 0;

  console.log('✅ Final grade computation completed successfully');
  console.log(`   📊 Computation Summary:`);
  console.log(`   - Successful computations: ${successCount}`);
  console.log(`   - Failed computations: ${errorCount}`);
  console.log(`   - Total final grades: ${finalGrades.length}`);
  console.log(`   - Total computation logs: ${gradeComputations.length}`);
  console.log(`   📈 Grade Statistics:`);
  console.log(`   - Average grade: ${averageGrade.toFixed(2)}`);
  console.log(`   - Passing rate: ${passingRate.toFixed(1)}%`);
  console.log(`   📋 Grade Distribution:`);
  for (const [letter, count] of Object.entries(gradeDistribution)) {
    const percentage = (count / finalGrades.length * 100).toFixed(1);
    console.log(`     ${letter}: ${count} students (${percentage}%)`);
  }
  console.log(`   🎯 Formula-Based Grading System:`);
  console.log(`     - Subject-specific grading formulas applied`);
  console.log(`     - Islamic school conditional rules enforced`);
  console.log(`     - Component mapping: homework→tugas_harian, assignment→ulangan_harian, midterm→uts, final→uas`);
  console.log(`     - Automatic formula evaluation with error handling`);
  console.log(`     - Complete audit trail in grade_computations table`);
  console.log(`     - Pass threshold: Subject-specific (default 60 points)`);
};
