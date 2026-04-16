import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

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

  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({ Bucket: this.bucket, Key: key });
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') return false;
      throw error;
    }
  }

  // Удаление файла по ключу
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.s3Client.send(command);
    } catch (error) {
      console.error(`Failed to delete file ${key} from MinIO:`, error);
      throw error; // пробрасываем дальше, если нужно
    }
  }

  // внутри класса MinioService
  async listObjects(prefix?: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix, // например, 'quests/' для фильтрации по папке
    });
    const response = await this.s3Client.send(command);
    const objects = response.Contents || [];

    return objects.map((obj) => obj.Key).filter((key): key is string => !!key);
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
    const prefix = `/${this.bucket}/`;
    const index = url.indexOf(prefix);
    if (index === -1) return null;
    return url.substring(index + prefix.length);
  }

  // Добавь этот метод
  async uploadToGallery(file: Express.Multer.File): Promise<string> {
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    const key = `quests/gallery/${fileName}`;

    await this.uploadFile(file, key);
    return `${this.publicEndpoint}/${this.bucket}/${key}`;
  }
}