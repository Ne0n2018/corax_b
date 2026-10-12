import { Injectable, Logger } from '@nestjs/common';
import { Counter, collectDefaultMetrics, Registry } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly register: Registry;

  // Счётчик просмотров карточек товаров (в разрезе названия товара)
  private readonly productViewsCounter: Counter<string>;
  // Счётчик проданных единиц товара (в разрезе названия и купленных опций)
  private readonly productSalesCounter: Counter<string>;
  // Счётчик HTTP-запросов приложения (оценка популярности сайта)
  private readonly httpRequestsCounter: Counter<string>;

  constructor() {
    this.register = new Registry();

    // Базовые метрики процесса (CPU, память и т.д.)
    collectDefaultMetrics({ register: this.register });

    // Counter for product page views, labeled by human-readable product name.
    // Значения только растут, поэтому в Grafana продажи/просмотры можно
    // считать за любой интервал через increase(...[1h|24h|7d|30d]).
    this.productViewsCounter = new Counter({
      name: 'product_views_total',
      help: 'Total number of product page views',
      labelNames: ['product_name'],
      registers: [this.register],
    });

    // Counter for sold product units, labeled by product name and the purchased
    // variant options (taste, size) so the admin sees what was bought.
    this.productSalesCounter = new Counter({
      name: 'product_sales_total',
      help: 'Total number of sold product units',
      labelNames: ['product_name', 'taste', 'size'],
      registers: [this.register],
    });

    // Counter for handled HTTP requests (site popularity / traffic).
    this.httpRequestsCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests handled by the application',
      labelNames: ['method', 'route', 'status'],
      registers: [this.register],
    });
  }

  /**
   * Учитывает просмотр карточки товара.
   * @param productName Человекочитаемое название товара
   */
  incrementProductView(productName: string): void {
    this.productViewsCounter.inc({ product_name: productName });
    this.logger.debug(`Incremented view for product "${productName}"`);
  }

  /**
   * Учитывает продажу варианта товара.
   * @param productName Название товара
   * @param taste       Купленный вкус (или '-' если не задан)
   * @param size        Купленный размер (или '-' если не задан)
   * @param quantity    Количество проданных единиц (по умолчанию 1)
   */
  incrementProductSale(
    productName: string,
    taste: string,
    size: string,
    quantity: number = 1,
  ): void {
    this.productSalesCounter.inc(
      { product_name: productName, taste: taste || '-', size: size || '-' },
      quantity,
    );
    this.logger.debug(
      `Incremented sale for product "${productName}" (${taste || '-'}/${size || '-'}) by ${quantity}`,
    );
  }

  /**
   * Учитывает обработанный HTTP-запрос (для оценки популярности сайта).
   * @param method HTTP-метод запроса
   * @param route  Шаблон маршрута (например, /product/:id)
   * @param status HTTP-статус ответа
   */
  observeHttpRequest(method: string, route: string, status: number): void {
    this.httpRequestsCounter.inc({
      method,
      route,
      status: String(status),
    });
  }

  /**
   * Отдаёт метрики в формате Prometheus.
   */
  async getMetrics(): Promise<string> {
    return await this.register.metrics();
  }
}
