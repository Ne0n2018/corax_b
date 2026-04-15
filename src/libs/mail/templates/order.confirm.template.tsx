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

export enum DeliveryType {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
  BELMAIL = 'BELMAIL',
  EUROMAIL = 'EUROMAIL',
}

interface OrderItem {
  productName: string;
  taste: string;
  size: string;
  quantity: number;
}

interface OrderConfirmTemplateProps {
  email: string;
  name: string;
  orderCode: number;
  deliveryType: DeliveryType;
  address?: string | null;
  items: OrderItem[];
}

/** Форматирует 6-значный код заказа вида «483 921» */
function formatCode(code: number): string {
  const s = String(code);
  return `${s.slice(0, 3)} ${s.slice(3)}`;
}

/** Подпись для строки адреса в зависимости от типа доставки */
function addressLabel(type: DeliveryType): string {
  switch (type) {
    case DeliveryType.DELIVERY:
      return 'Адрес доставки:';
    case DeliveryType.BELMAIL:
      return 'Адрес для Белпочты:';
    case DeliveryType.EUROMAIL:
      return 'Адрес для Европочты:';
    default:
      return 'Адрес для пункта выдачи:';
  }
}

export default function OrderConfirmTemplate({
  email,
  name,
  orderCode,
  deliveryType,
  address,
  items,
}: OrderConfirmTemplateProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-black text-white font-sans">
          <Container className="max-w-2xl mt-7 mb-4">
            {/* Шапка с логотипом */}
            <Row className="mb-8">
              <Column className="w-15">
                <Img
                  src="https://s3-minsk-dc2.cloud.mts.by:443/mail/images/1771329318595-logo.png"
                  alt="Corax Logo"
                />
              </Column>
              <Column className="pl-1">
                <Img
                  src="https://s3-minsk-dc2.cloud.mts.by:443/mail/images/1771332157665-Corax.png"
                  alt="Corax"
                />
              </Column>
            </Row>

            <Section className="border-t border-white mb-12" />

            {/* Приветствие */}
            <Text className="mb-4">Здравствуйте, {name}!</Text>

            <Text className="text-lg leading-relaxed mb-6">
              Ваш заказ принят и передан в обработку
            </Text>

            {/* Адрес: для PICKUP показываем только если передан, для остальных всегда */}
            {address && (
              <Text className="mb-6">
                {addressLabel(deliveryType)} {address}
              </Text>
            )}

            {/* Самовывоз без адреса */}
            {deliveryType === DeliveryType.PICKUP && !address && (
              <Text className="mb-6">Способ получения: самовывоз</Text>
            )}

            {/* Состав заказа */}
            <Text className="font-semibold mb-2">Состав заказа:</Text>
            {items.map((item, index) => {
              const details = [item.taste, item.size]
                .filter(Boolean)
                .join(', ');
              return (
                <Text key={index} className="ml-4 mb-1">
                  • {item.productName}
                  {details ? ` (${details})` : ''}
                  {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                </Text>
              );
            })}

            {/* Номер заказа */}
            <Text className="mt-8 mb-2">Номер вашего заказа:</Text>

            <Section className="bg-gray-900 rounded-lg text-center py-4 px-8 mb-2">
              <Text className="text-2xl font-bold tracking-widest m-0">
                {formatCode(orderCode)}
              </Text>
            </Section>

            <Text className="text-sm text-center mb-8">
              Никому не сообщайте этот номер.
            </Text>

            <Text>С уважением, команда Corax!</Text>

            {/* Подвал */}
            <Section className="border-t border-gray-700 pt-14 mt-12 text-center">
              <Text className="text-sm">
                Сообщение было отправлено на{' '}
                <Link href={`mailto:${email}`} className="underline text-white">
                  {email}
                </Link>
                .
              </Text>
              <Text className="text-sm">
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
