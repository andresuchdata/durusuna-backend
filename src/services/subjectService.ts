import type { AuthenticatedUser } from '../types/user';
import { SubjectRepository } from '../repositories/subjectRepository';
import type { SchoolSubject } from '../repositories/subjectRepository';

export class SubjectService {
  constructor(private subjectRepository: SubjectRepository) {}

  private ensureAdmin(currentUser: AuthenticatedUser): void {
    const isAdmin = currentUser.role === 'admin' || currentUser.user_type === 'admin';
    if (!isAdmin) {
      throw new Error('Admin access required');
    }
  }

  async getSchoolSubjects(currentUser: AuthenticatedUser): Promise<SchoolSubject[]> {
    this.ensureAdmin(currentUser);

    if (!currentUser.school_id) {
      throw new Error('Admin must be associated with a school');
    }

    return this.subjectRepository.findActiveSubjectsForSchool(currentUser.school_id);
  }
}
