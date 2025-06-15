import fs from "fs";
import path from "path";

export interface ScraperConfig {
  scrapers: {
    "2018": {
      enabled: boolean;
      programUrls: string[];
      programNames: string[];
      delays: {
        betweenSubjects: number;
        betweenPrograms: number;
        betweenBatches: number;
      };
      batching: {
        enabled: boolean;
        batchSize: number;
      };
    };
    "2023": {
      enabled: boolean;
      baseUrl: string;
      delays: {
        betweenPrograms: number;
      };
    };
  };
  output: {
    directory: string;
    filenames: {
      "2018": string;
      "2023": string;
      combined: string;
    };
    generateSummary: boolean;
  };
  http: {
    timeout: number;
    maxRedirects: number;
    userAgent: string;
  };
}

class ConfigManager {
  private static instance: ConfigManager;
  private config!: ScraperConfig;

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): void {
    try {
      let configPath = path.join(__dirname, "..", "config.json");

      if (!fs.existsSync(configPath)) {
        configPath = path.join(__dirname, "config.json");
      }

      if (!fs.existsSync(configPath)) {
        configPath = path.join(process.cwd(), "config.json");
      }

      const configData = fs.readFileSync(configPath, "utf8");
      this.config = JSON.parse(configData);
    } catch (error) {
      console.error("❌ Error loading config.json:", error);
      console.error(
        "❌ Make sure config.json exists in the project root directory"
      );
      process.exit(1);
    }
  }

  public getConfig(): ScraperConfig {
    return this.config;
  }

  public get scrapers() {
    return this.config.scrapers;
  }

  public get output() {
    return this.config.output;
  }

  public get http() {
    return this.config.http;
  }
}

export const config = ConfigManager.getInstance();
