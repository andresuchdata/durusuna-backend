const { v4: uuidv4 } = require('uuid');

/**
 * Comprehensive Assessments and Grades Seed
 * Creates realistic assessment data with proper grading for Islamic schools
 */

// Assessment templates for different subjects and types
const ASSESSMENT_TEMPLATES = {
  'Matematika': {
    homework: [
      'Latihan Soal Bab {chapter}: Bilangan Bulat',
      'PR: Operasi Hitung Campuran', 
      'Tugas Rumah: Geometri Dasar',
      'Latihan: Pecahan dan Desimal'
    ],
    assignment: [
      'Proyek Matematika: Pengukuran di Rumah',
      'Tugas Kelompok: Statistik Sederhana',
      'Investigasi: Pola Bilangan dalam Al-Quran',
      'Presentasi: Aplikasi Matematika dalam Ibadah'
    ],
    midterm: ['Ujian Tengah Semester - Matematika'],
    final: ['Ujian Akhir Semester - Matematika']
  },
  'Bahasa Indonesia': {
    homework: [
      'Analisis Puisi Islami',
      'Menulis Cerita Pendek Bernuansa Religius',
      'Latihan Tata Bahasa: Kalimat Efektif',
      'Membaca dan Merangkum Hadits'
    ],
    assignment: [
      'Proyek Sastra: Biografi Ulama Indonesia',
      'Tugas Presentasi: Cerita Rakyat Nusantara',
      'Karya Tulis: Nilai-nilai Islam dalam Sastra',
      'Drama Singkat: Kisah Para Nabi'
    ],
    midterm: ['Ujian Tengah Semester - Bahasa Indonesia'],
    final: ['Ujian Akhir Semester - Bahasa Indonesia']
  },
  'Bahasa Inggris': {
    homework: [
      'Islamic Vocabulary Practice',
      'Reading: Stories of Prophets (English)',
      'Grammar Exercise: Present Tense',
      'Conversation Practice: Daily Islamic Activities'
    ],
    assignment: [
      'Project: Islamic Countries Presentation',
      'Essay: My Daily Islamic Routine',
      'Video: Introducing Islamic Practices',
      'Research: Islamic Contributions to Science'
    ],
    midterm: ['Mid-Semester Exam - English'],
    final: ['Final Semester Exam - English']
  },
  'PKN': {
    homework: [
      'Analisis Pancasila dan Nilai Islam',
      'Studi Kasus: Toleransi Beragama',
      'Tugas: Hak dan Kewajiban Warga Negara Muslim',
      'Refleksi: Kepemimpinan dalam Islam'
    ],
    assignment: [
      'Proyek: Konstitusi dan Syariah',
      'Presentasi: Tokoh Pahlawan Muslim Indonesia',
      'Diskusi: Demokrasi dan Musyawarah',
      'Karya Tulis: NKRI dan Umat Islam'
    ],
    midterm: ['Ujian Tengah Semester - PKN'],
    final: ['Ujian Akhir Semester - PKN']
  },
  'Teknologi Informasi': {
    homework: [
      'Latihan Microsoft Office untuk Dakwah',
      'Tugas: Membuat Presentasi Islami',
      'Praktek: Internet Sehat menurut Islam',
      'Coding Sederhana: Kalkulator Zakat'
    ],
    assignment: [
      'Proyek: Website Sekolah Islam',
      'Aplikasi: Pengingat Waktu Sholat',
      'Video Tutorial: Adab Bermedia Sosial',
      'Database: Koleksi Hadits Digital'
    ],
    midterm: ['Ujian Tengah Semester - TI'],
    final: ['Ujian Akhir Semester - TI']
  },
  'Dirosah': {
    homework: [
      'Hafalan Hadits: Akhlak kepada Orang Tua',
      'Tugas: Cerita 25 Nabi dan Rasul',
      'Latihan: Bacaan Sholat yang Benar',
      'Analisis: Hikmah dalam Peristiwa Hijrah'
    ],
    assignment: [
      'Proyek: Miniatur Masjid Nabawi',
      'Presentasi: Kisah Sahabat Rasulullah',
      'Drama: Adab Islami dalam Kehidupan',
      'Penelitian: Tradisi Islam Nusantara'
    ],
    midterm: ['Ujian Tengah Semester - Dirosah'],
    final: ['Ujian Akhir Semester - Dirosah']
  }
};

// Realistic grade distributions for Islamic school context
const GRADE_DISTRIBUTIONS = {
  homework: { mean: 82, stdDev: 8, min: 65, max: 100 },
  assignment: { mean: 85, stdDev: 7, min: 70, max: 100 },
  midterm: { mean: 78, stdDev: 12, min: 50, max: 98 },
  final: { mean: 80, stdDev: 10, min: 55, max: 95 }
};

/**
 * Generate a realistic grade using normal distribution
 */
function generateRealisticGrade(type, studentPerformance = 'average') {
  const dist = GRADE_DISTRIBUTIONS[type];
  let baseMean = dist.mean;
  
  // Adjust based on student performance level
  switch(studentPerformance) {
    case 'excellent': baseMean += 8; break;
    case 'good': baseMean += 4; break;
    case 'average': break;
    case 'struggling': baseMean -= 6; break;
  }
  
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  let grade = Math.round(baseMean + (dist.stdDev * z0));
  
  // Clamp to realistic bounds
  grade = Math.max(dist.min, Math.min(dist.max, grade));
  
  return grade;
}

/**
 * Assign performance levels to students for variety
 */
function getStudentPerformanceLevel(studentIndex) {
  // Distribute students across performance levels
  if (studentIndex === 0) return 'excellent';
  if (studentIndex === 1) return 'good';
  if (studentIndex === 4) return 'struggling';
  return 'average';
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  console.log('📝 Seeding comprehensive assessments and grades...');
  
  // Delete existing assessment data
  await knex('assessment_grades').del();
  await knex('assessments').del();
  
  // Get current academic period (Semester 1)
  const academicPeriod = await knex('academic_periods')
    .where('is_current', true)
    .where('type', 'semester')
    .first();
    
  if (!academicPeriod) {
    console.log('❌ No current academic period found');
    return;
  }

  // Get all class offerings with subject details
  const classOfferings = await knex('class_offerings')
    .join('subjects', 'class_offerings.subject_id', 'subjects.id')
    .join('classes', 'class_offerings.class_id', 'classes.id')
    .select(
      'class_offerings.id as offering_id',
      'class_offerings.primary_teacher_id',
      'subjects.name as subject_name',
      'classes.name as class_name'
    )
    .where('class_offerings.is_active', true);

  console.log(`📚 Creating assessments for ${classOfferings.length} class offerings...`);

  const assessments = [];
  const assessmentGrades = [];
  
  // Get semester date range for realistic scheduling
  const semesterStart = new Date('2024-07-15');
  const semesterMid = new Date('2024-10-15'); 
  const semesterEnd = new Date('2024-12-20');

  for (const offering of classOfferings) {
    const subjectTemplates = ASSESSMENT_TEMPLATES[offering.subject_name];
    
    if (!subjectTemplates) {
      console.log(`⚠️  No templates found for subject: ${offering.subject_name}`);
      continue;
    }

    // Get enrolled students for this offering
    const enrolledStudents = await knex('enrollments')
      .where('class_offering_id', offering.offering_id)
      .where('status', 'active')
      .select('student_id');

    // Create assessments for each type
    for (const [assessmentType, templates] of Object.entries(subjectTemplates)) {
      for (let i = 0; i < templates.length; i++) {
        // Generate realistic due dates
        let dueDate, publishedDate;
        switch(assessmentType) {
          case 'homework':
            dueDate = new Date(semesterStart.getTime() + (i + 1) * 14 * 24 * 60 * 60 * 1000); // Every 2 weeks
            publishedDate = new Date(dueDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 1 week before
            break;
          case 'assignment':
            dueDate = new Date(semesterStart.getTime() + (i + 1) * 21 * 24 * 60 * 60 * 1000); // Every 3 weeks  
            publishedDate = new Date(dueDate.getTime() - 14 * 24 * 60 * 60 * 1000); // 2 weeks before
            break;
          case 'midterm':
            dueDate = semesterMid;
            publishedDate = new Date(semesterMid.getTime() - 21 * 24 * 60 * 60 * 1000); // 3 weeks before
            break;
          case 'final':
            dueDate = semesterEnd;
            publishedDate = new Date(semesterEnd.getTime() - 28 * 24 * 60 * 60 * 1000); // 4 weeks before
            break;
        }

        const assessmentId = uuidv4();
        
        // Map assessment types to match database constraints
        let dbType = assessmentType;
        if (assessmentType === 'homework' || assessmentType === 'midterm') {
          dbType = 'assignment'; // Map to valid type
        } else if (assessmentType === 'final') {
          dbType = 'final_exam';
        }
        
        assessments.push({
          id: assessmentId,
          class_offering_id: offering.offering_id,
          title: templates[i],
          description: `${assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)} untuk ${offering.subject_name} - ${offering.class_name}`,
          type: dbType,
          max_score: assessmentType === 'homework' ? 20 : (assessmentType === 'assignment' ? 25 : 100),
          weight_override: assessmentType === 'homework' ? 0.2 : (assessmentType === 'assignment' ? 0.3 : (assessmentType === 'midterm' ? 0.2 : 0.3)),
          group_tag: assessmentType,
          sequence_no: i + 1,
          assigned_date: publishedDate.toISOString().split('T')[0], // Convert to date
          due_date: dueDate,
          instructions: JSON.stringify({
            text: `Silakan kerjakan ${templates[i]} dengan baik dan penuh tanggung jawab. Ingatlah untuk selalu memulai dengan basmalah.`,
            submission_type: assessmentType === 'final' || assessmentType === 'midterm' ? 'in_person' : 'digital'
          }),
          rubric: JSON.stringify({
            criteria: [
              { name: 'Kelengkapan', weight: 0.3, max_score: 30 },
              { name: 'Ketepatan', weight: 0.4, max_score: 40 },
              { name: 'Kerapihan', weight: 0.3, max_score: 30 }
            ]
          }),
          is_published: true,
          allow_late_submission: assessmentType !== 'midterm' && assessmentType !== 'final',
          late_penalty_per_day: assessmentType === 'homework' ? 0.05 : 0.10, // 5% or 10% per day
          created_by: offering.primary_teacher_id,
          created_at: publishedDate,
          updated_at: publishedDate
        });

        // Create grades for all enrolled students
        for (let j = 0; j < enrolledStudents.length; j++) {
          const student = enrolledStudents[j];
          const performanceLevel = getStudentPerformanceLevel(j);
          const score = generateRealisticGrade(assessmentType, performanceLevel);
          
          // Determine submission timing
          const isLate = Math.random() < 0.15; // 15% chance of late submission
          const submittedAt = isLate ? 
            new Date(dueDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000) : // 0-3 days late
            new Date(dueDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);   // Up to 1 week early
          
          // Apply late penalty if applicable (convert percentage to points)
          const latePenaltyPoints = isLate && assessmentType !== 'midterm' && assessmentType !== 'final' ? 
            Math.round(score * (assessmentType === 'homework' ? 0.05 : 0.10)) : 0;
          const adjustedScore = Math.max(0, score - latePenaltyPoints);

          assessmentGrades.push({
            id: uuidv4(),
            assessment_id: assessmentId,
            student_id: student.student_id,
            score: score,
            adjusted_score: adjustedScore,
            status: 'graded',
            submitted_at: submittedAt,
            graded_at: new Date(submittedAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000), // Graded within 3 days
            graded_by: offering.primary_teacher_id,
            feedback: generateFeedback(score, assessmentType),
            is_late: isLate,
            days_late: isLate ? Math.ceil((submittedAt - dueDate) / (24 * 60 * 60 * 1000)) : 0,
            attachments: [],
            created_at: submittedAt,
            updated_at: new Date()
          });
        }
      }
    }
  }

  // Insert assessments and grades in batches
  console.log(`📋 Inserting ${assessments.length} assessments...`);
  const assessmentBatchSize = 50;
  for (let i = 0; i < assessments.length; i += assessmentBatchSize) {
    const batch = assessments.slice(i, i + assessmentBatchSize);
    await knex('assessments').insert(batch);
  }

  console.log(`📊 Inserting ${assessmentGrades.length} assessment grades...`);
  const gradesBatchSize = 100;
  for (let i = 0; i < assessmentGrades.length; i += gradesBatchSize) {
    const batch = assessmentGrades.slice(i, i + gradesBatchSize);
    await knex('assessment_grades').insert(batch);
  }

  // Generate statistics
  const assessmentsByType = assessments.reduce((acc, a) => {
    acc[a.type] = (acc[a.type] || 0) + 1;
    return acc;
  }, {});

  const averageGrades = assessmentGrades.reduce((acc, g) => {
    if (!acc[g.assessment_id]) acc[g.assessment_id] = [];
    acc[g.assessment_id].push(g.adjusted_score);
    return acc;
  }, {});

  console.log('✅ Comprehensive assessments and grades seeded successfully');
  console.log(`   📊 Assessment Summary:`);
  console.log(`   - Total assessments: ${assessments.length}`);
  console.log(`   - Total grades: ${assessmentGrades.length}`);
  console.log('   📝 Assessment types:');
  for (const [type, count] of Object.entries(assessmentsByType)) {
    console.log(`     ${type}: ${count} assessments`);
  }
  console.log(`   📈 Performance distribution:`);
  console.log(`   - Average homework scores: ~82 points`);
  console.log(`   - Average assignment scores: ~85 points`); 
  console.log(`   - Average midterm scores: ~78 points`);
  console.log(`   - Average final scores: ~80 points`);
  console.log(`   ⏰ Late submissions: ~15% with appropriate penalties`);
  console.log(`   🎯 Ready for final grade computation`);
};

/**
 * Generate contextual feedback based on score and assessment type
 */
function generateFeedback(score, type) {
  const islamicPhrases = [
    'Barakallahu fiik', 'Jazakallahu khairan', 'Tabaarakallahu',
    'Alhamdulillahi rabbil alamiin', 'Maa syaa Allah'
  ];
  
  if (score >= 90) {
    return `${islamicPhrases[Math.floor(Math.random() * islamicPhrases.length)]}! Pekerjaan yang sangat baik. Pertahankan semangat belajar ini.`;
  } else if (score >= 80) {
    return `Alhamdulillah, pekerjaan yang baik. Terus tingkatkan dengan lebih teliti lagi.`;
  } else if (score >= 70) {
    return `Cukup baik, namun masih bisa ditingkatkan. Jangan lupa berdoa sebelum belajar.`;
  } else {
    return `Perlu lebih banyak latihan dan usaha. Ingatlah, "Wa man jaahada fa innama yujaahidu li nafsihi". Semangat!`;
  }
}
