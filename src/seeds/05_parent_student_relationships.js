const { v4: uuidv4 } = require('uuid');

// Parent-Student relationship mapping
const PARENT_STUDENT_MAPPINGS = [
  // SDIT Parents (Parents 1-15 for SDIT students)
  { parentId: '40000000-0000-0000-0000-000000000001', studentIds: ['30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000011'] }, // Parent 1 -> Student 1A1, 2C1
  { parentId: '40000000-0000-0000-0000-000000000002', studentIds: ['30000000-0000-0000-0000-000000000002'] }, // Parent 2 -> Student 1A2
  { parentId: '40000000-0000-0000-0000-000000000003', studentIds: ['30000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000012'] }, // Parent 3 -> Student 1A3, 2C2
  { parentId: '40000000-0000-0000-0000-000000000004', studentIds: ['30000000-0000-0000-0000-000000000004'] }, // Parent 4 -> Student 1A4
  { parentId: '40000000-0000-0000-0000-000000000005', studentIds: ['30000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000021'] }, // Parent 5 -> Student 1A5, 3D1
  
  { parentId: '40000000-0000-0000-0000-000000000006', studentIds: ['30000000-0000-0000-0000-000000000013'] }, // Parent 6 -> Student 2C3
  { parentId: '40000000-0000-0000-0000-000000000007', studentIds: ['30000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000022'] }, // Parent 7 -> Student 2C4, 3D2
  { parentId: '40000000-0000-0000-0000-000000000008', studentIds: ['30000000-0000-0000-0000-000000000015'] }, // Parent 8 -> Student 2C5
  { parentId: '40000000-0000-0000-0000-000000000009', studentIds: ['30000000-0000-0000-0000-000000000023', '30000000-0000-0000-0000-000000000031'] }, // Parent 9 -> Student 3D3, 4B1
  { parentId: '40000000-0000-0000-0000-000000000010', studentIds: ['30000000-0000-0000-0000-000000000024'] }, // Parent 10 -> Student 3D4
  
  { parentId: '40000000-0000-0000-0000-000000000011', studentIds: ['30000000-0000-0000-0000-000000000025', '30000000-0000-0000-0000-000000000032'] }, // Parent 11 -> Student 3D5, 4B2
  { parentId: '40000000-0000-0000-0000-000000000012', studentIds: ['30000000-0000-0000-0000-000000000033'] }, // Parent 12 -> Student 4B3
  { parentId: '40000000-0000-0000-0000-000000000013', studentIds: ['30000000-0000-0000-0000-000000000034', '30000000-0000-0000-0000-000000000041'] }, // Parent 13 -> Student 4B4, 5A1
  { parentId: '40000000-0000-0000-0000-000000000014', studentIds: ['30000000-0000-0000-0000-000000000035'] }, // Parent 14 -> Student 4B5
  { parentId: '40000000-0000-0000-0000-000000000015', studentIds: ['30000000-0000-0000-0000-000000000042', '30000000-0000-0000-0000-000000000051'] }, // Parent 15 -> Student 5A2, 6C1
  
  // SMP Parents (Parents 16-20 for SMP students - some parents have multiple children)
  { parentId: '40000000-0000-0000-0000-000000000016', studentIds: ['30000000-0000-0000-0000-000000000101', '30000000-0000-0000-0000-000000000111'] }, // Parent 16 -> Student 7M1_1, 7MD1_1
  { parentId: '40000000-0000-0000-0000-000000000017', studentIds: ['30000000-0000-0000-0000-000000000102', '30000000-0000-0000-0000-000000000121'] }, // Parent 17 -> Student 7M1_2, 8M1_1
  { parentId: '40000000-0000-0000-0000-000000000018', studentIds: ['30000000-0000-0000-0000-000000000103', '30000000-0000-0000-0000-000000000112'] }, // Parent 18 -> Student 7M1_3, 7MD1_2
  { parentId: '40000000-0000-0000-0000-000000000019', studentIds: ['30000000-0000-0000-0000-000000000104', '30000000-0000-0000-0000-000000000131'] }, // Parent 19 -> Student 7M1_4, 8MD1_1
  { parentId: '40000000-0000-0000-0000-000000000020', studentIds: ['30000000-0000-0000-0000-000000000105', '30000000-0000-0000-0000-000000000141'] }, // Parent 20 -> Student 7M1_5, 9M1_1
  
  // Some students with shared parents (realistic family scenarios)
  { parentId: '40000000-0000-0000-0000-000000000016', studentIds: ['30000000-0000-0000-0000-000000000113'] }, // Parent 16 also -> Student 7MD1_3
  { parentId: '40000000-0000-0000-0000-000000000017', studentIds: ['30000000-0000-0000-0000-000000000122'] }, // Parent 17 also -> Student 8M1_2
  { parentId: '40000000-0000-0000-0000-000000000018', studentIds: ['30000000-0000-0000-0000-000000000132'] }, // Parent 18 also -> Student 8MD1_2
  { parentId: '40000000-0000-0000-0000-000000000019', studentIds: ['30000000-0000-0000-0000-000000000142'] }, // Parent 19 also -> Student 9M1_2
  { parentId: '40000000-0000-0000-0000-000000000020', studentIds: ['30000000-0000-0000-0000-000000000151'] }, // Parent 20 also -> Student 9MD2_1
];

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('parent_student_relationships').del();
  
  const relationships = [];
  let relationshipCount = 0;
  
  PARENT_STUDENT_MAPPINGS.forEach(mapping => {
    mapping.studentIds.forEach((studentId, index) => {
      relationships.push({
        id: uuidv4(),
        parent_id: mapping.parentId,
        student_id: studentId,
        relationship_type: 'parent',
        can_receive_notifications: true,
        can_view_grades: true,
        can_view_attendance: true,
        is_primary_contact: index === 0, // First relationship for each parent is primary
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      });
      relationshipCount++;
    });
  });
  
  await knex('parent_student_relationships').insert(relationships);

  console.log('✅ Parent-Student relationships seeded successfully');
  console.log(`   - Total relationships: ${relationshipCount}`);
  console.log('   - Multi-child families: Several parents have 2-3 children');
  console.log('   - All parents can receive notifications and view grades/attendance');
};
