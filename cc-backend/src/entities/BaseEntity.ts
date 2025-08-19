export interface BaseEntity {
  partitionKey: string;
  rowKey: string;
  timestamp?: Date;
  etag?: string;
}

export abstract class BaseTableEntity implements BaseEntity {
  public partitionKey: string = '';
  public rowKey: string = '';
  public timestamp?: Date;
  public etag?: string;

  constructor(partitionKey: string, rowKey: string) {
    this.partitionKey = partitionKey;
    this.rowKey = rowKey;
  }
}
