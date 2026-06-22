import { Injectable, Logger } from '@nestjs/common';
import { Gauge, collectDefaultMetrics, Registry } from 'prom-client';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly register: Registry;

  // Gauges for current month product views and sales
  private productViewsGauge: Gauge<string>;
  private productSalesGauge: Gauge<string>;

  constructor() {
    this.register = new Registry();

    // Enable default metrics (CPU, memory, etc.)
    collectDefaultMetrics({ register: this.register });

    // Initialize gauges for product views and sales (current month)
    this.productViewsGauge = new Gauge({
      name: 'product_views_current_month',
      help: 'Current month product views',
      labelNames: ['product_id'],
      registers: [this.register],
    });

    this.productSalesGauge = new Gauge({
      name: 'product_sales_current_month',
      help: 'Current month product sales',
      labelNames: ['product_id'],
      registers: [this.register],
    });
  }

  /**
   * Increment the view count for a product.
   * @param productId The ID of the product
   */
  incrementProductView(productId: string): void {
    this.productViewsGauge.inc({ product_id: productId });
    this.logger.debug(`Incremented view for product ${productId}`);
  }

  /**
   * Increment the sale count for a product.
   * @param productId The ID of the product
   * @param quantity The quantity sold (default: 1)
   */
  incrementProductSale(productId: string, quantity: number = 1): void {
    this.productSalesGauge.inc({ product_id: productId }, quantity);
    this.logger.debug(
      `Incremented sale for product ${productId} by ${quantity}`,
    );
  }

  /**
   * Reset the gauges for the current month.
   * This should be called at the beginning of each month.
   */
  resetMonthlyGauges(): void {
    this.productViewsGauge.reset();
    this.productSalesGauge.reset();
    this.logger.log('Reset monthly product views and sales gauges');
  }

  /**
   * Cron job to reset the gauges at the beginning of each month.
   * Runs at 00:00 on the first day of the month.
   */
  @Cron('0 0 1 * *')
  handleMonthlyReset(): void {
    this.resetMonthlyGauges();
  }

  /**
   * Get the metrics in the Prometheus format.
   */
  async getMetrics(): Promise<string> {
    return await this.register.metrics();
  }
}
