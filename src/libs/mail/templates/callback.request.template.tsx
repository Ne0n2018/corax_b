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

interface CallbackRequestTemplateProps {
  email: string;
  name: string;
  phone: string;
}

export default function CallbackRequestTemplate({
  email,
  name,
  phone,
}: CallbackRequestTemplateProps) {
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

            <Text className="text-lg leading-relaxed mb-2 ">
              Поступил запрос на обратный звонок по номеру телефона:
            </Text>

            <Section className="bg-gray-900 rounded-lg text-center py-4 px-8 mb-8">
              <Text className="text-2xl font-bold tracking-widest m-0">
                {phone}
              </Text>
            </Section>

            <Text className="text-lg leading-relaxed mb-8">
              Пожалуйста, свяжитесь с клиентом в ближайшее время.
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
