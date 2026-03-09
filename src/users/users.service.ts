import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOneBy({ phone });
  }

  async create(phone: string, password: string, name?: string): Promise<User> {
    const existing = await this.findByPhone(phone);
    if (existing) throw new ConflictException('Номер уже зарегистрирован');

    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      phone,
      passwordHash,
      name,
      isPhoneConfirmed: true,
    });
    return this.usersRepository.save(user);
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOneBy({ id });
  }

  // Методы для CRUD (если нужны)
  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: number, updateUserDto: any): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException('User not found');
  }
  async updateRole(id: number, role: UserRole): Promise<User> {
    const user = await this.findOne(id); // метод findOne уже должен быть
    user.role = role;
    return this.usersRepository.save(user);
  }
}
