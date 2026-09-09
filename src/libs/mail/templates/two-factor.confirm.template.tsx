import {
  Html,
  Body,
  Container,
  Section,
  Img,
  Text,
  Link,
  Head,
  Column,
  Row,
} from '@react-email/components';
import { Tailwind } from '@react-email/tailwind';
import * as React from 'react';

interface ConfirmationTemplateProps {
  email: string;
  token: string;
  name: string;
}

export default function TwoFactorTemplate({
  email,
  token,
  name,
}: ConfirmationTemplateProps) {
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
              Ваш код двухфакторной аунтефикации
            </Text>

            <Section className="text-center mb-8 bg-[#212227] px-55.25 py-6 rounded-2xl">
              {token}
            </Section>
            <Text className="text-sm text-center  mb-7">
              Никому не сообщайте этот код
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
              Если вы получили это электронное письмо, но не пытаетесь пройти
              двухфакторную аунтефикацию, проигнорируйте это сообщение. Если вы
              никому не передавали этот код, никаких дальнейших действий от вас
              не требуется.
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
