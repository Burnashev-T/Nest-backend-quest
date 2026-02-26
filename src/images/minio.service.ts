import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

@Injectable()
export class MinioService {
  private s3Client: S3Client;
  private bucket: string;
  private publicEndpoint: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT');
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY');
    const bucket = this.configService.get<string>('MINIO_BUCKET');
    const publicEndpoint = this.configService.get<string>(
      'MINIO_PUBLIC_ENDPOINT',
    );

    if (!endpoint || !accessKey || !secretKey || !bucket || !publicEndpoint) {
      throw new Error(
        'MinIO configuration is incomplete. Check your .env file.',
      );
    }

    this.bucket = bucket;
    this.publicEndpoint = publicEndpoint;

    this.s3Client = new S3Client({
      endpoint,
      region: 'us-east-1', // MinIO игнорирует регион
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // обязательно для MinIO
    });
  }

  // Загрузка файла из буфера (если загружаем через сервер)
  async uploadFile(file: Express.Multer.File, key: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    await this.s3Client.send(command);
    // Возвращаем публичный URL (если бакет публичный) или presigned URL позже
    return `${this.publicEndpoint}/${this.bucket}/${key}`;
  }

  // Удаление файла по ключу
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.s3Client.send(command);
  }


// внутри класса MinioService
async listObjects(prefix?: string): Promise<string[]> {
  const command = new ListObjectsV2Command({
    Bucket: this.bucket,
    Prefix: prefix, // например, 'quests/' для фильтрации по папке
  });
  const response = await this.s3Client.send(command);
  const objects = response.Contents || [];
  // @ts-ignore
  return objects.map(obj => obj.Key).filter(key => key); // отфильтровываем возможные undefined
}



  // Генерация временной ссылки для чтения (если бакет приватный)
  async generatePresignedGetUrl(
    key: string,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  // Вспомогательный метод для извлечения ключа из полного URL
  extractKeyFromUrl(url: string): string | null {
    // Ожидаем формат: http(s)://host:port/bucket/key
    const parts = url.split('/');
    // Индекс бакета в пути зависит от forcePathStyle (всегда после хоста)
    // При forcePathStyle: true URL = endpoint/bucket/key
    const bucketIndex = parts.findIndex((part) => part === this.bucket);
    if (bucketIndex === -1) return null;
    return parts.slice(bucketIndex + 1).join('/');
  }
}