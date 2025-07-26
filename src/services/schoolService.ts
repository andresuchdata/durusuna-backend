import { SchoolRepository } from '../repositories/schoolRepository';
import { AuthenticatedUser } from '../types/user';

export interface School {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  settings?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface CreateSchoolData {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  settings?: Record<string, any>;
}

export interface UpdateSchoolData {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  settings?: Record<string, any>;
}

export class SchoolService {
  constructor(private schoolRepository: SchoolRepository) {}

  async getAllSchools(): Promise<School[]> {
    return await this.schoolRepository.findAll();
  }

  async getSchoolById(schoolId: string, currentUser: AuthenticatedUser): Promise<School> {
    // Check if user has access to this school
    if (currentUser.role !== 'admin' && currentUser.school_id !== schoolId) {
      throw new Error('Access denied');
    }

    const school = await this.schoolRepository.findById(schoolId);
    if (!school) {
      throw new Error('School not found');
    }

    return school;
  }

  async createSchool(data: CreateSchoolData): Promise<School> {
    // TODO: Add validation with Zod schema
    const schoolId = await this.schoolRepository.create(data);
    
    const school = await this.schoolRepository.findById(schoolId);
    if (!school) {
      throw new Error('Failed to create school');
    }

    return school;
  }

  async updateSchool(schoolId: string, data: UpdateSchoolData): Promise<School> {
    // TODO: Add validation with Zod schema
    const existingSchool = await this.schoolRepository.findById(schoolId);
    if (!existingSchool) {
      throw new Error('School not found');
    }

    await this.schoolRepository.update(schoolId, data);
    
    const updatedSchool = await this.schoolRepository.findById(schoolId);
    if (!updatedSchool) {
      throw new Error('Failed to update school');
    }

    return updatedSchool;
  }
} 