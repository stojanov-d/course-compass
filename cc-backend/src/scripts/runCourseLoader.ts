import { CourseJsonLoader } from './loadCoursesFromJson';
import * as path from 'path';

async function main() {
  try {
    const args = process.argv.slice(2);
    const jsonFilePath =
      args[0] ||
      path.join(__dirname, '../../../scraper/dist/subjects-2023.json');

    console.log('🚀 Starting Course JSON Loader...');
    console.log(`📁 JSON file path: ${path.resolve(jsonFilePath)}`);

    const fs = require('fs');
    if (!fs.existsSync(jsonFilePath)) {
      console.error(`❌ JSON file not found: ${jsonFilePath}`);
      process.exit(1);
    }

    await CourseJsonLoader.createAndRun(jsonFilePath);

    console.log('🎉 Course loading completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Fatal error during course loading:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { main };
