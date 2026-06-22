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
  PICKUP   = 'PICKUP',
  DELIVERY = 'DELIVERY',
  BELMAIL  = 'BELMAIL',
  EUROMAIL = 'EUROMAIL',
}

export enum OrderStatus {
  PENDING    = 'PENDING',
  PAID       = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED    = 'SHIPPED',
  DELIVERED  = 'DELIVERED',
  CANCELLED  = 'CANCELLED',
}

interface OrderItem {
  productName: string;
  taste: string;
  size: string;
  quantity: number;
}

interface OrderStatusTemplateProps {
  email: string;
  name: string;
  orderCode: number;
  status: OrderStatus;
  deliveryType: DeliveryType;
  address?: string | null;
  items: OrderItem[];
}

/** Форматирует 6-значный код заказа вида «483 921» */
function formatCode(code: number): string {
  const s = String(code);
  return `${s.slice(0, 3)} ${s.slice(3)}`;
}

/** Тема письма */
export function getStatusSubject(status: OrderStatus, deliveryType: DeliveryType): string {
  switch (status) {
    case OrderStatus.SHIPPED:
      return deliveryType === DeliveryType.DELIVERY
        ? 'Ваш заказ принят — Corax (Доставка)'
        : 'Ваш заказ принят — Corax (Самовывоз)';
    case OrderStatus.DELIVERED:
      return 'Заказ доставлен — Corax';
    case OrderStatus.CANCELLED:
      return 'Заказ отменён — Corax';
    default:
      return 'Обновление статуса заказа — Corax';
  }
}

/** Статусы, при которых отправляется уведомление */
export const NOTIFIABLE_STATUSES: OrderStatus[] = [
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

/** Основной текст письма в зависимости от статуса и типа доставки */
function statusMessage(status: OrderStatus, deliveryType: DeliveryType): string {
  switch (status) {
    case OrderStatus.SHIPPED:
      switch (deliveryType) {
        case DeliveryType.DELIVERY:
          return 'Ваш заказ готов к доставке по указанному адресу, наш курьер в ближайшее время с вами свяжется';
        case DeliveryType.BELMAIL:
          return 'Ваш заказ передан в Белпочту. Ожидайте посылку по указанному адресу.';
        case DeliveryType.EUROMAIL:
          return 'Ваш заказ передан в Европочту. Ожидайте посылку по указанному адресу.';
        case DeliveryType.PICKUP:
        default:
          return 'Ваш заказ готов к выдаче!';
      }
    case OrderStatus.DELIVERED:
      return 'Ваш заказ доставлен. Спасибо за покупку в Corax!';
    case OrderStatus.CANCELLED:
      return 'К сожалению, ваш заказ был отменён. Если у вас есть вопросы — свяжитесь с нами.';
    default:
      return 'Статус вашего заказа был обновлён.';
  }
}

/** Подпись строки адреса */
function addressLabel(type: DeliveryType): string {
  switch (type) {
    case DeliveryType.DELIVERY:  return 'Адрес доставки:';
    case DeliveryType.BELMAIL:   return 'Адрес для Белпочты:';
    case DeliveryType.EUROMAIL:  return 'Адрес для Европочты:';
    default:                     return 'Адрес для пункта выдачи:';
  }
}

/** Показывать ли блок с адресом для данного статуса */
function shouldShowAddress(status: OrderStatus): boolean {
  return [
    OrderStatus.SHIPPED,
    OrderStatus.DELIVERED,
  ].includes(status);
}

export default function OrderStatusTemplate({
  email,
  name,
  orderCode,
  status,
  deliveryType,
  address,
  items,
}: OrderStatusTemplateProps) {
  const showAddress = shouldShowAddress(status) && !!address;

  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-black text-white font-sans">
          <Container className="max-w-2xl mt-7 mb-4">
            {/* Шапка */}
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

            {/* Приветствие и статусное сообщение */}
            <Text className="mb-4">Здравствуйте, {name}!</Text>

            <Text className="text-lg leading-relaxed mb-6">
              {statusMessage(status, deliveryType)}
            </Text>

            {/* Адрес */}
            {showAddress && (
              <Text className="mb-6">
                {addressLabel(deliveryType)} {address}
              </Text>
            )}

            {/* Состав заказа (не показываем при отмене) */}
            {status !== OrderStatus.CANCELLED && (
              <>
                <Text className="font-semibold mb-2">Состав заказа:</Text>
                {items.map((item, index) => {
                  const details = [item.taste, item.size].filter(Boolean).join(', ');
                  return (
                    <Text key={index} className="ml-4 mb-1">
                      • {item.productName}
                      {details ? ` (${details})` : ''}
                      {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                    </Text>
                  );
                })}
              </>
            )}

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
