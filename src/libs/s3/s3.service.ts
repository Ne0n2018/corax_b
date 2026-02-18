import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { S3 } from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly bucket: string;

  constructor(
    @Inject('S3_CLIENT') private readonly s3: S3,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.getOrThrow('S3_BUCKET_NAME');
  }

  // Auto-configure on startup
  async onModuleInit() {
    await this.configurePublicBucket();
  }

  // Configure bucket for public access (run once)
  async configurePublicBucket(): Promise<void> {
    try {
      // Create bucket if not exists (supported, page 22)
      try {
        await this.s3.headBucket({ Bucket: this.bucket });
      } catch (error) {
        if (error.statusCode === 404) {
          await this.s3.createBucket({ Bucket: this.bucket });
          console.log('Bucket created');
        }
      }

      // Set Bucket Policy for public read (supported, page 65)
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${this.bucket}/*`,
          },
        ],
      };

      await this.s3.putBucketPolicy({
        Bucket: this.bucket,
        Policy: JSON.stringify(policy),
      });

      console.log('Bucket configured for public access');
    } catch (error) {
      console.error('Full error:', error);
      throw new BadRequestException(`Bucket config failed: ${error.message}`);
    }
  }

  // Upload image with public access
  async uploadImage(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    if (!contentType.startsWith('image/')) {
      throw new BadRequestException('Only images allowed');
    }

    try {
      await this.s3.putObject({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'public-read', // Public access (supported, page 15)
      });

      const endpoint = this.configService.getOrThrow('S3_ENDPOINT');
      return `${endpoint}/${this.bucket}/${key}`; // Permanent public URL
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }
}
