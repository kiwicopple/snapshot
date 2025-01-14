import { createTestDb } from '../../../testing.js'
import { withDbClient } from '../../client.js'
import { fetchDatabaseRelationships } from './fetchDatabaseRelationships.js'

test('should return empty array if no relations', async () => {
  const structure = `
    CREATE TABLE "Courses" (
        "CourseID" SERIAL PRIMARY KEY,
        "CourseName" VARCHAR(255) NOT NULL
    );
    CREATE TABLE "Students" (
        "StudentID" SERIAL PRIMARY KEY,
        "FirstName" VARCHAR(255) NOT NULL,
        "LastName" VARCHAR(255) NOT NULL
    );
  `
  const connString = await createTestDb(structure)
  const relationshipss = await withDbClient(fetchDatabaseRelationships, {
    connString: connString.toString(),
  })
  expect(relationshipss.length).toEqual(0)
})

test('should get composite FK and basic FK', async () => {
  const structure = `
    CREATE TABLE "Courses" (
        "CourseID" SERIAL PRIMARY KEY,
        "CourseName" VARCHAR(255) NOT NULL
    );
    CREATE TABLE "Students" (
        "StudentID" SERIAL PRIMARY KEY,
        "FirstName" VARCHAR(255) NOT NULL,
        "LastName" VARCHAR(255) NOT NULL
    );
    CREATE TABLE "Enrollments" (
        "CourseID" INT NOT NULL,
        "StudentID" INT NOT NULL,
        PRIMARY KEY ("CourseID", "StudentID"),
        FOREIGN KEY ("CourseID") REFERENCES "Courses"("CourseID"),
        FOREIGN KEY ("StudentID") REFERENCES "Students"("StudentID")
    );
    CREATE TABLE "Grades" (
        "CourseID" INT NOT NULL,
        "StudentID" INT NOT NULL,
        "ExamName" VARCHAR(255) NOT NULL,
        "Grade" FLOAT NOT NULL,
        PRIMARY KEY ("CourseID", "StudentID", "ExamName"),
        FOREIGN KEY ("CourseID", "StudentID") REFERENCES "Enrollments"("CourseID", "StudentID")
    );
  `
  const connString = await createTestDb(structure)
  const relationships = await withDbClient(fetchDatabaseRelationships, {
    connString: connString.toString(),
  })
  expect(relationships).toEqual(
    expect.arrayContaining([
      {
        fkTable: 'public.Enrollments',
        id: 'Enrollments_CourseID_fkey',

        keys: [
          {
            fkColumn: 'CourseID',
            fkType: 'int4',
            nullable: false,
            targetColumn: 'CourseID',
            targetType: 'int4',
          },
        ],
        targetTable: 'public.Courses',
      },
      {
        fkTable: 'public.Enrollments',
        id: 'Enrollments_StudentID_fkey',

        keys: [
          {
            fkColumn: 'StudentID',
            fkType: 'int4',
            nullable: false,
            targetColumn: 'StudentID',
            targetType: 'int4',
          },
        ],
        targetTable: 'public.Students',
      },
      {
        fkTable: 'public.Grades',
        id: 'Grades_CourseID_StudentID_fkey',

        keys: [
          {
            fkColumn: 'CourseID',
            fkType: 'int4',
            nullable: false,
            targetColumn: 'CourseID',
            targetType: 'int4',
          },
          {
            fkColumn: 'StudentID',
            fkType: 'int4',
            nullable: false,
            targetColumn: 'StudentID',
            targetType: 'int4',
          },
        ],
        targetTable: 'public.Enrollments',
      },
    ])
  )
})

test('should get FK on multiples schemas', async () => {
  const structure = `
    CREATE SCHEMA private;
    CREATE TABLE public."Courses" (
        "CourseID" SERIAL PRIMARY KEY,
        "CourseName" VARCHAR(255) NOT NULL
    );
    CREATE TABLE public."Students" (
        "StudentID" SERIAL PRIMARY KEY,
        "FirstName" VARCHAR(255) NOT NULL,
        "LastName" VARCHAR(255) NOT NULL,
        "StudentCourseId" INT NOT NULL,
        FOREIGN KEY ("StudentCourseId") REFERENCES public."Courses"("CourseID")
    );
    CREATE TABLE private."Courses" (
        "CourseID" SERIAL PRIMARY KEY,
        "CourseName" VARCHAR(255) NOT NULL
    );
    CREATE TABLE private."Enrollments" (
        "CourseID" INT NOT NULL,
        PRIMARY KEY ("CourseID"),
        FOREIGN KEY ("CourseID") REFERENCES private."Courses"("CourseID")
    );
  `
  const connString = await createTestDb(structure)
  const relationships = await withDbClient(fetchDatabaseRelationships, {
    connString: connString.toString(),
  })
  expect(relationships).toEqual(
    expect.arrayContaining([
      {
        fkTable: 'private.Enrollments',
        id: 'Enrollments_CourseID_fkey',

        keys: [
          {
            fkColumn: 'CourseID',
            fkType: 'int4',
            nullable: false,
            targetColumn: 'CourseID',
            targetType: 'int4',
          },
        ],
        targetTable: 'private.Courses',
      },
      {
        fkTable: 'public.Students',
        id: 'Students_StudentCourseId_fkey',

        keys: [
          {
            fkColumn: 'StudentCourseId',
            fkType: 'int4',
            nullable: false,
            targetColumn: 'CourseID',
            targetType: 'int4',
          },
        ],
        targetTable: 'public.Courses',
      },
    ])
  )
})

test('should get FK on multiples schemas and nullables', async () => {
  const structure = `
    CREATE SCHEMA private;
    CREATE TABLE public."Courses" (
        "CourseID" SERIAL PRIMARY KEY,
        "CourseName" VARCHAR(255) NOT NULL
    );
    CREATE TABLE public."Students" (
        "StudentID" SERIAL PRIMARY KEY,
        "FirstName" VARCHAR(255) NOT NULL,
        "LastName" VARCHAR(255) NOT NULL,
        "StudentCourseId" INT,
        FOREIGN KEY ("StudentCourseId") REFERENCES public."Courses"("CourseID")
    );
    CREATE TABLE private."Courses" (
        "CourseID" SERIAL PRIMARY KEY,
        "CourseName" VARCHAR(255) NOT NULL
    );
    CREATE TABLE private."Enrollments" (
        "CourseID" INT,
        "StudentID" INT,
        UNIQUE ("CourseID", "StudentID"),
        FOREIGN KEY ("CourseID") REFERENCES private."Courses"("CourseID"),
        FOREIGN KEY ("StudentID") REFERENCES public."Students"("StudentID")
    );
    CREATE TABLE public."Grades" (
        "CourseID" INT,
        "StudentID" INT,
        "ExamName" VARCHAR(255),
        "Grade" FLOAT NOT NULL,
        PRIMARY KEY ("CourseID", "StudentID", "ExamName"),
        FOREIGN KEY ("CourseID", "StudentID") REFERENCES private."Enrollments"("CourseID", "StudentID")
    );
  `
  const connString = await createTestDb(structure)
  const relationships = await withDbClient(fetchDatabaseRelationships, {
    connString: connString.toString(),
  })
  expect(relationships).toEqual(
    expect.arrayContaining([
      {
        fkTable: 'private.Enrollments',
        id: 'Enrollments_CourseID_fkey',

        keys: [
          {
            fkColumn: 'CourseID',
            fkType: 'int4',
            nullable: true,
            targetColumn: 'CourseID',
            targetType: 'int4',
          },
        ],
        targetTable: 'private.Courses',
      },
      {
        fkTable: 'private.Enrollments',
        id: 'Enrollments_StudentID_fkey',

        keys: [
          {
            fkColumn: 'StudentID',
            fkType: 'int4',
            nullable: true,
            targetColumn: 'StudentID',
            targetType: 'int4',
          },
        ],
        targetTable: 'public.Students',
      },
      {
        fkTable: 'public.Grades',
        id: 'Grades_CourseID_StudentID_fkey',

        keys: [
          {
            fkColumn: 'CourseID',
            fkType: 'int4',
            nullable: false,
            targetColumn: 'CourseID',
            targetType: 'int4',
          },
          {
            fkColumn: 'StudentID',
            fkType: 'int4',
            nullable: false,
            targetColumn: 'StudentID',
            targetType: 'int4',
          },
        ],
        targetTable: 'private.Enrollments',
      },
      {
        fkTable: 'public.Students',
        id: 'Students_StudentCourseId_fkey',

        keys: [
          {
            fkColumn: 'StudentCourseId',
            fkType: 'int4',
            nullable: true,
            targetColumn: 'CourseID',
            targetType: 'int4',
          },
        ],
        targetTable: 'public.Courses',
      },
    ])
  )
})
