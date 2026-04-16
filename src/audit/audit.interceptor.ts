import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return next.handle();
    }

    const { method, url, body, params, query } = req;

    return next.handle().pipe(
      tap({
        next: (data) => {
          const res = context.switchToHttp().getResponse();
          const audit = this.auditRepository.create({
            adminId: user.userId,
            adminName: user.name || user.phone,
            action: this.getActionName(method, url),
            method,
            url,
            requestBody: body,
            requestParams: params,
            requestQuery: query,
            responseStatus: res.statusCode,
          });
          this.auditRepository
            .save(audit)
            .catch((e) => console.error('Audit save error', e));
        },
        error: (err) => {
          const audit = this.auditRepository.create({
            adminId: user.userId,
            adminName: user.name || user.phone,
            action: this.getActionName(method, url),
            method,
            url,
            requestBody: body,
            requestParams: params,
            requestQuery: query,
            responseStatus: err.status || 500,
          });
          this.auditRepository
            .save(audit)
            .catch((e) => console.error('Audit save error', e));
        },
      }),
    );
  }

  private getActionName(method: string, url: string): string {
    const resource = url.split('/')[1] || 'unknown';
    switch (method) {
      case 'POST':
        return `CREATE_${resource.toUpperCase()}`;
      case 'PATCH':
        return `UPDATE_${resource.toUpperCase()}`;
      case 'DELETE':
        return `DELETE_${resource.toUpperCase()}`;
      default:
        return `${method}_${resource.toUpperCase()}`;
    }
  }
}
