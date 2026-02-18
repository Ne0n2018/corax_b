import {
  Body,
  Column,
  Container,
  Head,
  Html,
  Img,
  Link,
  Row,
  Section,
  Text,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';
import * as React from 'react';

interface ResetPasswordTemplateProps {
  email: string;
  domain: string;
  token: string;
  name: string;
}

export default function ResetPasswordTemplate({
  email,
  domain,
  token,
  name,
}: ResetPasswordTemplateProps) {
  const resetLink = `${domain}/new-password?token=${token}`;

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-black text-white font-sans">
          <Container className="max-w-2xl mt-7 mb-4 ">
            <Row className="mb-8">
              <Column className="w-[60px]">
                <Img
                  src="https://s3-minsk-dc2.cloud.mts.by:443/mail/images/1771329318595-logo.png" // Абсолютный URL
                  alt="Corax Logo"
                />
              </Column>
              <Column className="pl-1">
                <Img
                  src="https://s3-minsk-dc2.cloud.mts.by:443/mail/images/1771332157665-Corax.png"
                  alt="text"
                />
              </Column>
            </Row>

            <Section className="border-t border-white mb-12" />

            <Text className="mb-4">Здравствуйте, {name}!</Text>

            <Text className="text-lg leading-relaxed mb-6 ">
              Вы запросили восстановление пароля для аккаунта Corax.
            </Text>

            <Section className="text-center mb-8">
              <Link
                href={resetLink}
                className="bg-white text-black font-bold py-4 px-8 rounded-lg inline-block no-underline"
              >
                Восстановить пароль
              </Link>
            </Section>
            <Text className="text-sm  mb-7">
              Код действителен в течение 60 минут.
            </Text>
            <Text className="font-semibold text-sm">
              Если кто-то просит передать этот код
            </Text>
            <Text>
              Никому не передавайте этот код. Это может быть попытка взломать
              ваш аккаунт.
            </Text>
            <Text className="font-semibold text-sm">
              Вы не запрашивали код?
            </Text>
            <Text>
              Если вы получили это электронное письмо, но не пытаетесь
              подтвердить почту, проигнорируйте это сообщение. Если вы никому не
              передавали этот код, никаких дальнейших действий от вас не
              требуется.
            </Text>
            <Text>С уважением, команда Corax!</Text>
            <Section className="border-t border-gray-700 pt-14 mt-12 text-center">
              <Text className="text-sm ">
                Сообщение было отправлено на{' '}
                <Link href={email} className="underline text-white">
                  {email}
                </Link>
                .
              </Text>
              <Text className="text-sm ">
                Чтобы сохранить безопасность вашего аккаунта, не пересылайте это
                электронное письмо.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
