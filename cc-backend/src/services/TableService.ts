import { TableServiceClient, TableClient } from "@azure/data-tables";
import { TABLE_NAMES } from "../config/tableStorage";

export class TableService {
  private tableServiceClient: TableServiceClient;
  private connectionString: string;

  constructor() {
    this.connectionString =
      process.env.AZURE_STORAGE_CONNECTION_STRING ||
      "UseDevelopmentStorage=true";
    this.tableServiceClient = TableServiceClient.fromConnectionString(
      this.connectionString
    );
  }

  async initializeTables(): Promise<void> {
    console.log("🔄 Initializing tables...");

    for (const tableName of Object.values(TABLE_NAMES)) {
      try {
        await this.tableServiceClient.createTable(tableName);
        console.log(`✅ Created table: ${tableName}`);
      } catch (error: any) {
        if (error.statusCode === 409) {
          console.log(`ℹ️  Table already exists: ${tableName}`);
        } else {
          console.error(`❌ Error creating table ${tableName}:`, error.message);
        }
      }
    }
  }

  async deleteAllTables(): Promise<void> {
    console.log("🗑️  Deleting all tables...");

    for (const tableName of Object.values(TABLE_NAMES)) {
      try {
        await this.tableServiceClient.deleteTable(tableName);
        console.log(`✅ Deleted table: ${tableName}`);
      } catch (error: any) {
        if (error.statusCode === 404) {
          console.log(`ℹ️  Table doesn't exist: ${tableName}`);
        } else {
          console.error(`❌ Error deleting table ${tableName}:`, error.message);
        }
      }
    }
  }

  getTableClient(tableName: string): TableClient {
    return TableClient.fromConnectionString(this.connectionString, tableName);
  }

  async clearTable(tableName: string): Promise<void> {
    console.log(`🧹 Clearing table: ${tableName}`);
    const tableClient = this.getTableClient(tableName);

    try {
      const entities = tableClient.listEntities();
      for await (const entity of entities) {
        await tableClient.deleteEntity(
          entity.partitionKey as string,
          entity.rowKey as string
        );
      }
      console.log(`✅ Cleared table: ${tableName}`);
    } catch (error: any) {
      console.error(`❌ Error clearing table ${tableName}:`, error.message);
    }
  }
}
