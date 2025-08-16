const { v4: uuidv4 } = require('uuid');

// Import consistent IDs
const CLASS_IDS = {
  SDIT_1A: '50000000-0000-0000-0000-000000000001',
  SDIT_2C: '50000000-0000-0000-0000-000000000002',
  SDIT_3D: '50000000-0000-0000-0000-000000000003',
  SDIT_4B: '50000000-0000-0000-0000-000000000004',
  SDIT_5A: '50000000-0000-0000-0000-000000000005',
  SDIT_6C: '50000000-0000-0000-0000-000000000006',
  SMP_7M1: '50000000-0000-0000-0000-000000000011',
  SMP_7MD1: '50000000-0000-0000-0000-000000000012',
  SMP_8M1: '50000000-0000-0000-0000-000000000013',
  SMP_8MD1: '50000000-0000-0000-0000-000000000014',
  SMP_9M1: '50000000-0000-0000-0000-000000000015',
  SMP_9MD2: '50000000-0000-0000-0000-000000000016'
};

const STUDENT_IDS = {
  // SDIT Students (5 per class)
  SDIT_1A: [
    '30000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000005'
  ],
  SDIT_2C: [
    '30000000-0000-0000-0000-000000000011',
    '30000000-0000-0000-0000-000000000012',
    '30000000-0000-0000-0000-000000000013',
    '30000000-0000-0000-0000-000000000014',
    '30000000-0000-0000-0000-000000000015'
  ],
  SDIT_3D: [
    '30000000-0000-0000-0000-000000000021',
    '30000000-0000-0000-0000-000000000022',
    '30000000-0000-0000-0000-000000000023',
    '30000000-0000-0000-0000-000000000024',
    '30000000-0000-0000-0000-000000000025'
  ],
  SDIT_4B: [
    '30000000-0000-0000-0000-000000000031',
    '30000000-0000-0000-0000-000000000032',
    '30000000-0000-0000-0000-000000000033',
    '30000000-0000-0000-0000-000000000034',
    '30000000-0000-0000-0000-000000000035'
  ],
  SDIT_5A: [
    '30000000-0000-0000-0000-000000000041',
    '30000000-0000-0000-0000-000000000042',
    '30000000-0000-0000-0000-000000000043',
    '30000000-0000-0000-0000-000000000044',
    '30000000-0000-0000-0000-000000000045'
  ],
  SDIT_6C: [
    '30000000-0000-0000-0000-000000000051',
    '30000000-0000-0000-0000-000000000052',
    '30000000-0000-0000-0000-000000000053',
    '30000000-0000-0000-0000-000000000054',
    '30000000-0000-0000-0000-000000000055'
  ],
  
  // SMP Students (5 per class)
  SMP_7M1: [
    '30000000-0000-0000-0000-000000000101',
    '30000000-0000-0000-0000-000000000102',
    '30000000-0000-0000-0000-000000000103',
    '30000000-0000-0000-0000-000000000104',
    '30000000-0000-0000-0000-000000000105'
  ],
  SMP_7MD1: [
    '30000000-0000-0000-0000-000000000111',
    '30000000-0000-0000-0000-000000000112',
    '30000000-0000-0000-0000-000000000113',
    '30000000-0000-0000-0000-000000000114',
    '30000000-0000-0000-0000-000000000115'
  ],
  SMP_8M1: [
    '30000000-0000-0000-0000-000000000121',
    '30000000-0000-0000-0000-000000000122',
    '30000000-0000-0000-0000-000000000123',
    '30000000-0000-0000-0000-000000000124',
    '30000000-0000-0000-0000-000000000125'
  ],
  SMP_8MD1: [
    '30000000-0000-0000-0000-000000000131',
    '30000000-0000-0000-0000-000000000132',
    '30000000-0000-0000-0000-000000000133',
    '30000000-0000-0000-0000-000000000134',
    '30000000-0000-0000-0000-000000000135'
  ],
  SMP_9M1: [
    '30000000-0000-0000-0000-000000000141',
    '30000000-0000-0000-0000-000000000142',
    '30000000-0000-0000-0000-000000000143',
    '30000000-0000-0000-0000-000000000144',
    '30000000-0000-0000-0000-000000000145'
  ],
  SMP_9MD2: [
    '30000000-0000-0000-0000-000000000151',
    '30000000-0000-0000-0000-000000000152',
    '30000000-0000-0000-0000-000000000153',
    '30000000-0000-0000-0000-000000000154',
    '30000000-0000-0000-0000-000000000155'
  ]
};

const TEACHER_IDS = {
  SDIT: [
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000004'
  ],
  SMP: [
    '20000000-0000-0000-0000-000000000011',
    '20000000-0000-0000-0000-000000000012',
    '20000000-0000-0000-0000-000000000013',
    '20000000-0000-0000-0000-000000000014'
  ]
};

/**
 * Generate attendance records for date range July 1 - Aug 15, 2025
 * Skip weekends (Saturday and Sunday)
 */
function generateAttendanceDates() {
  const dates = [];
  const startDate = new Date('2025-07-01');
  const endDate = new Date('2025-08-15');
  
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}

/**
 * Generate random attendance status with realistic distribution
 */
function getRandomAttendanceStatus() {
  const random = Math.random();
  if (random < 0.85) return 'present';      // 85% present
  if (random < 0.92) return 'late';         // 7% late
  if (random < 0.97) return 'excused';      // 5% excused
  return 'absent';                          // 3% absent
}

/**
 * Generate random check-in time based on school schedule
 */
function getRandomCheckInTime(isSDIT) {
  const baseHour = isSDIT ? 7 : 7; // SDIT starts 7:30, SMP starts 7:00
  const baseMinute = isSDIT ? 30 : 0;
  
  // Add some randomness (-15 to +30 minutes)
  const randomMinutes = Math.floor(Math.random() * 45) - 15;
  const totalMinutes = baseHour * 60 + baseMinute + randomMinutes;
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('attendance_records').del();
  
  const attendanceRecords = [];
  const attendanceDates = generateAttendanceDates();
  
  console.log(`📅 Generating attendance for ${attendanceDates.length} school days (July 1 - Aug 15, 2025)`);
  
  // Generate attendance for each class
  Object.entries(CLASS_IDS).forEach(([className, classId]) => {
    const isSDIT = className.startsWith('SDIT');
    const studentList = STUDENT_IDS[className];
    const teacherList = isSDIT ? TEACHER_IDS.SDIT : TEACHER_IDS.SMP;
    
    // For each date
    attendanceDates.forEach(date => {
      // For each student in the class
      studentList.forEach(studentId => {
        const status = getRandomAttendanceStatus();
        const markedBy = teacherList[Math.floor(Math.random() * teacherList.length)];
        
        let checkInTime = null;
        let notes = null;
        let locationVerified = false;
        let latitude = null;
        let longitude = null;
        
        // Set check-in time and notes based on status
        if (status === 'present') {
          checkInTime = getRandomCheckInTime(isSDIT);
          locationVerified = Math.random() > 0.1; // 90% location verified
          if (locationVerified) {
            // Set school coordinates with small random offset
            if (isSDIT) {
              latitude = -0.9009373 + (Math.random() - 0.5) * 0.001;
              longitude = 100.3756626 + (Math.random() - 0.5) * 0.001;
            } else {
              latitude = -0.8981452379675374 + (Math.random() - 0.5) * 0.001;
              longitude = 100.3614347974181 + (Math.random() - 0.5) * 0.001;
            }
          }
        } else if (status === 'late') {
          checkInTime = getRandomCheckInTime(isSDIT);
          // Add 30-90 minutes delay for late students
          const [hours, minutes] = checkInTime.split(':').map(Number);
          const totalMinutes = hours * 60 + minutes + 30 + Math.floor(Math.random() * 60);
          const newHours = Math.floor(totalMinutes / 60);
          const newMinutes = totalMinutes % 60;
          checkInTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:00`;
          notes = 'Terlambat karena macet/transportasi';
          locationVerified = Math.random() > 0.2; // 80% location verified
        } else if (status === 'excused') {
          notes = ['Sakit dengan surat dokter', 'Keperluan keluarga', 'Izin sekolah'][Math.floor(Math.random() * 3)];
        } else if (status === 'absent') {
          notes = ['Tidak hadir tanpa keterangan', 'Sakit tanpa surat', 'Alpha'][Math.floor(Math.random() * 3)];
        }
        
        attendanceRecords.push({
          id: uuidv4(),
          class_id: classId,
          student_id: studentId,
          attendance_date: date.toISOString().split('T')[0], // YYYY-MM-DD format
          status: status,
          check_in_time: checkInTime,
          notes: notes,
          marked_by: markedBy,
          marked_via: status === 'present' && locationVerified ? 'gps' : 'manual',
          student_latitude: latitude,
          student_longitude: longitude,
          location_verified: locationVerified,
          created_at: new Date(date.getTime() + Math.random() * 86400000), // Random time on that date
          updated_at: new Date(date.getTime() + Math.random() * 86400000)
        });
      });
    });
  });
  
  // Insert in batches for better performance
  const batchSize = 1000;
  for (let i = 0; i < attendanceRecords.length; i += batchSize) {
    const batch = attendanceRecords.slice(i, i + batchSize);
    await knex('attendance_records').insert(batch);
  }

  console.log('✅ Attendance records seeded successfully');
  console.log(`   - Total records: ${attendanceRecords.length}`);
  console.log(`   - Period: July 1 - August 15, 2025 (${attendanceDates.length} school days)`);
  console.log(`   - 12 classes × 5 students × ${attendanceDates.length} days`);
  console.log('   - Realistic distribution: 85% present, 7% late, 5% excused, 3% absent');
  console.log('   - GPS location data for present/late students');
  console.log('   - Random check-in times and contextual notes');
};
