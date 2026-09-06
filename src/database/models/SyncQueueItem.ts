import { Model } from '@nozbe/watermelondb';
import { text, field } from '@nozbe/watermelondb/decorators';

export class SyncQueueItemModel extends Model {
  static table = 'sync_queue';

  @text('report_id') reportId!: string;
  @text('action') action!: 'create' | 'update' | 'confirm';
  @text('payload') payload!: string;
  @field('created_at') createdAt!: number;
  @field('attempts') attempts!: number;
  @text('last_error') lastError?: string;
  @text('status') status!: 'pending' | 'processing' | 'synced' | 'failed';
}
