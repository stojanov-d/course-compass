export interface BaseEntity {
  partitionKey: string;
  rowKey: string;
  timestamp?: Date;
}

export abstract class BaseTableEntity implements BaseEntity {
  public partitionKey: string = "";
  public rowKey: string = "";
  public timestamp?: Date;

  constructor(partitionKey: string, rowKey: string) {
    this.partitionKey = partitionKey;
    this.rowKey = rowKey;
  }
}
