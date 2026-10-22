import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const CONTENT_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx':
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.rtf': 'application/rtf',
  '.txt': 'text/plain; charset=utf-8',
};

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    console.error(`Не задана переменная окружения ${name}`);
    process.exit(1);
  }

  return value;
}

async function main() {
  const [fileArg, keyArg] = process.argv.slice(2);

  if (!fileArg) {
    console.error(
      'Использование: pnpm upload:document -- <путь-к-файлу> [ключ-в-S3]\n' +
        'Пример: pnpm upload:document -- "./Политика персональных данных.pdf" documents/privacy-policy.pdf',
    );
    process.exit(1);
  }

  const filePath = resolve(fileArg);
  const ext = extname(filePath).toLowerCase();
  const contentType = CONTENT_TYPES[ext];

  if (!contentType) {
    console.error(
      `Неподдерживаемый формат файла "${ext}". Разрешены: ${Object.keys(
        CONTENT_TYPES,
      ).join(', ')}`,
    );
    process.exit(1);
  }

  const bucket = requireEnv('S3_BUCKET_NAME');
  const endpoint = requireEnv('S3_ENDPOINT').replace(/\/+$/, '');
  const key = keyArg || `documents/privacy-policy${ext}`;

  const client = new S3Client({
    endpoint,
    region: requireEnv('S3_REGION'),
    credentials: {
      accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY'),
    },
    forcePathStyle: true,
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: readFileSync(filePath),
      ContentType: contentType,
      ACL: 'public-read',
    }),
  );

  const url = `${endpoint}/${bucket}/${encodeURIComponent(key)}`;

  console.log(`Файл загружен: ${basename(filePath)}`);
  console.log(`Ключ в S3: ${key}`);
  console.log(`Публичная ссылка: ${url}`);
}

main().catch((error) => {
  console.error('Не удалось загрузить файл:', error?.message || error);
  process.exit(1);
});
