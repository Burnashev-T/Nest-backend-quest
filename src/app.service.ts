import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';

@Injectable()
export class AppService {
  getHello(): string {
    const bcrypt = require('bcrypt');
    console.log(bcrypt.hashSync('StrongPassword123', 10));
    return bcrypt.hashSync('StrongPassword123', 10);
  }
}
