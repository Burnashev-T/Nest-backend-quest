import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Logger } from 'nestjs-pino';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: Logger) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, user } = req;
    this.logger.log(
      `Request: ${method} ${url} - user: ${user?.userId || 'anonymous'}`,
    );
    const now = Date.now();
    return next
      .handle()
      .pipe(
        tap(() =>
          this.logger.log(`Response: ${method} ${url} - ${Date.now() - now}ms`),
        ),
      );
  }
}
