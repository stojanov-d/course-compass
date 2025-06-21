import { TableService } from '../services/TableService';
import { TABLE_NAMES } from '../config/tableStorage';

export class CourseDataValidator {
  private tableService: TableService;

  constructor() {
    this.tableService = new TableService();
  }

  async validateCourseData(): Promise<void> {
    try {
      console.log('🔍 Validating course data in Azure Table Storage...');

      const coursesTable = this.tableService.getTableClient(
        TABLE_NAMES.COURSES
      );

      const courseEntities = coursesTable.listEntities({
        queryOptions: {
          filter: "PartitionKey ne 'COURSE_CODE'",
        },
      });

      const lookupEntities = coursesTable.listEntities({
        queryOptions: {
          filter: "PartitionKey eq 'COURSE_CODE'",
        },
      });

      let courseCount = 0;
      let lookupCount = 0;
      const semesterCounts: { [key: string]: number } = {};
      const sampleCourses: any[] = [];

      for await (const entity of courseEntities) {
        courseCount++;

        const semester = entity.semester as number;
        const semesterKey = `Semester ${semester}`;
        semesterCounts[semesterKey] = (semesterCounts[semesterKey] || 0) + 1;

        if (sampleCourses.length < 5) {
          sampleCourses.push(entity);
        }
      }

      for await (const _entity of lookupEntities) {
        lookupCount++;
      }

      console.log('\n📊 Course Data Validation Results:');
      console.log('=====================================');
      console.log(`📚 Total Course Entities: ${courseCount}`);
      console.log(`🔍 Total Lookup Entities: ${lookupCount}`);

      console.log('\n📅 Distribution by Semester:');
      Object.entries(semesterCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([semester, count]) => {
          console.log(`   ${semester}: ${count} courses`);
        });

      console.log('\n🔬 Data Integrity Checks:');

      if (courseCount === lookupCount) {
        console.log('✅ Course and lookup entity counts match');
      } else {
        console.log('❌ Course and lookup entity counts do not match');
        console.log(`   Courses: ${courseCount}, Lookups: ${lookupCount}`);
      }

      if (sampleCourses.length > 0) {
        console.log('\n📝 Sample Course Data:');
        sampleCourses.forEach((course, index) => {
          console.log(`\n   ${index + 1}. ${course.courseName}`);
          console.log(`      Code: ${course.courseCode}`);
          console.log(`      Semester: ${course.semester}`);
          console.log(`      Required: ${course.isRequired}`);
          console.log(`      Credits: ${course.credits}`);
          try {
            const studyPrograms = JSON.parse(course.studyPrograms as string);
            console.log(
              `      Study Programs: ${studyPrograms.length} programs`
            );
          } catch {
            console.log('      ❌ Invalid studyPrograms JSON');
          }

          try {
            const professors = JSON.parse(course.professors as string);
            console.log(`      Professors: ${professors.length} professors`);
          } catch {
            console.log('      ❌ Invalid professors JSON');
          }
        });
      }

      console.log('\n🎯 Validation Summary:');
      if (courseCount > 0) {
        console.log('✅ Course data loaded successfully');
        console.log(`📈 Total courses processed: ${courseCount}`);
      } else {
        console.log('❌ No course data found in storage');
      }
    } catch (error) {
      console.error('❌ Error validating course data:', error);
      throw error;
    }
  }

  static async run(): Promise<void> {
    const validator = new CourseDataValidator();
    await validator.validateCourseData();
  }
}

// Run validation if called directly
if (require.main === module) {
  CourseDataValidator.run()
    .then(() => {
      console.log('\n✅ Validation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Validation failed:', error);
      process.exit(1);
    });
}
