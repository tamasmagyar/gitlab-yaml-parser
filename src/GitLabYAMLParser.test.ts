import * as fs from 'fs';
import * as path from 'path';
import { GitLabYAMLParser } from './GitLabYAMLParser';

describe('GitLabYAMLParser', () => {
  let parser: GitLabYAMLParser;
  const testDir = path.join(__dirname, 'fixtures');

  beforeEach(() => {
    parser = new GitLabYAMLParser(testDir);
  });

  describe('constructor', () => {
    it('should use current working directory by default', () => {
      const defaultParser = new GitLabYAMLParser();
      expect(defaultParser).toBeInstanceOf(GitLabYAMLParser);
    });

    it('should accept custom project path', () => {
      const customPath = '/custom/path';
      const customParser = new GitLabYAMLParser(customPath);
      expect(customParser).toBeInstanceOf(GitLabYAMLParser);
    });
  });

  describe('parseProject', () => {
    it('should parse a GitLab project with valid YAML files', async () => {
      const project = await parser.parseProject();
      
      expect(project).toBeDefined();
      expect(project.files).toBeInstanceOf(Array);
      expect(project.getAllJobs).toBeInstanceOf(Function);
      expect(project.getJobsByFile).toBeInstanceOf(Function);
      expect(project.getJobsWithVariable).toBeInstanceOf(Function);
      expect(project.getJobsByStage).toBeInstanceOf(Function);
      expect(project.getFileVariables).toBeInstanceOf(Function);
    });

    it('should handle projects with no GitLab files', async () => {
      const emptyDir = path.join(__dirname, 'empty');
      const emptyParser = new GitLabYAMLParser(emptyDir);
      
      const project = await emptyParser.parseProject();
      expect(project.files).toEqual([]);
      expect(project.getAllJobs()).toEqual([]);
    });

    it('should skip invalid YAML files and continue parsing', async () => {
      const project = await parser.parseProject();
      
      // Should still return a valid project even if some files fail to parse
      expect(project).toBeDefined();
      expect(project.files).toBeInstanceOf(Array);
    });
  });

  describe('private methods', () => {
    describe('findGitLabFiles', () => {
      it('should find .gitlab-ci.yml files', async () => {
        // Access private method for testing
        const findFiles = (parser as any).findGitLabFiles.bind(parser);
        const files = await findFiles();
        
        expect(files).toBeInstanceOf(Array);
        // Should find at least the main .gitlab-ci.yml file
        expect(files.some((file: string) => file.includes('.gitlab-ci.yml'))).toBe(true);
      });

      it('should find files in .gitlab directory', async () => {
        const findFiles = (parser as any).findGitLabFiles.bind(parser);
        const files = await findFiles();
        
        // Should find files in .gitlab subdirectory
        expect(files.some((file: string) => file.includes('.gitlab/'))).toBe(true);
      });

      it('should remove duplicate files', async () => {
        const findFiles = (parser as any).findGitLabFiles.bind(parser);
        const files = await findFiles();
        
        const uniqueFiles = [...new Set(files)];
        expect(files.length).toBe(uniqueFiles.length);
      });
    });

    describe('parseFile', () => {
      it('should parse a valid GitLab YAML file', async () => {
        const testFile = path.join(testDir, '.gitlab-ci.yml');
        const parseFile = (parser as any).parseFile.bind(parser);
        
        const file = await parseFile(testFile);
        
        expect(file).toBeDefined();
        expect(file.path).toBe(testFile);
        expect(file.jobs).toBeInstanceOf(Object);
        expect(file.variables).toBeInstanceOf(Object);
      });

      it('should throw error for invalid YAML content', async () => {
        const invalidFile = path.join(testDir, 'invalid.yml');
        const parseFile = (parser as any).parseFile.bind(parser);
        
        await expect(parseFile(invalidFile)).rejects.toThrow();
      });

      it('should skip hidden jobs and special keys', async () => {
        const testFile = path.join(testDir, '.gitlab-ci.yml');
        const parseFile = (parser as any).parseFile.bind(parser);
        
        const file = await parseFile(testFile);
        
        // Should not include hidden jobs (starting with .)
        const hiddenJobs = Object.keys(file.jobs).filter(key => key.startsWith('.'));
        expect(hiddenJobs).toHaveLength(0);
      });
    });

    describe('parseJob', () => {
      it('should parse a job with all properties', () => {
        const jobData = {
          script: ['echo "Hello World"'],
          before_script: ['echo "Before"'],
          after_script: ['echo "After"'],
          variables: { TEST_VAR: 'test_value' },
          stage: 'test',
          needs: ['build'],
          dependencies: ['build'],
          rules: [{ if: '$CI_COMMIT_BRANCH == "main"' }],
          artifacts: { paths: ['dist/'] },
          cache: { key: 'node_modules' },
          services: ['postgres:13']
        };

        const parseJob = (parser as any).parseJob.bind(parser);
        const job = parseJob('test-job', jobData);

        expect(job).toEqual({
          name: 'test-job',
          ...jobData
        });
      });

      it('should handle minimal job data', () => {
        const jobData = {
          script: ['echo "Hello"']
        };

        const parseJob = (parser as any).parseJob.bind(parser);
        const job = parseJob('minimal-job', jobData);

        expect(job).toEqual({
          name: 'minimal-job',
          script: ['echo "Hello"'],
          variables: {},
          before_script: undefined,
          after_script: undefined,
          stage: undefined,
          needs: undefined,
          dependencies: undefined,
          rules: undefined,
          artifacts: undefined,
          cache: undefined,
          services: undefined
        });
      });
    });
  });

  describe('GitLab reference support', () => {
    it('should detect GitLab references', () => {
      const reference = {
        __gitlab_reference: true,
        value: ['.scripts', 'build_script']
      };
      
      expect(parser.isReference(reference)).toBe(true);
    });

    it('should detect GitLab includes', () => {
      const include = {
        __gitlab_include: true,
        value: 'local.yml'
      };
      
      expect(parser.isInclude(include)).toBe(true);
    });

    it('should extract reference values', () => {
      const reference = {
        __gitlab_reference: true,
        value: ['.scripts', 'build_script']
      };
      
      const extracted = parser.extractReferenceValue(reference);
      expect(extracted).toEqual(['.scripts', 'build_script']);
    });

    it('should parse files with !reference tags', async () => {
      const referenceFile = path.join(testDir, 'reference-example.yml');
      const parseFile = (parser as any).parseFile.bind(parser);
      
      const file = await parseFile(referenceFile);
      
      expect(file).toBeDefined();
      expect(file.path).toBe(referenceFile);
      expect(file.jobs).toBeInstanceOf(Object);
      
      // Check that jobs with references are parsed
      expect(file.jobs['build-job']).toBeDefined();
      expect(file.jobs['test-job']).toBeDefined();
      expect(file.jobs['reference-variables-job']).toBeDefined();
      expect(file.jobs['reference-rules-job']).toBeDefined();
    });

    it('should handle reference resolution', () => {
      const data = {
        job: {
          script: {
            __gitlab_reference: true,
            value: ['.scripts', 'build_script']
          }
        }
      };
      
      const resolved = parser.resolveReferences(data);
      expect(resolved.job.script.__gitlab_reference).toBe(true);
      expect(resolved.job.script.value).toEqual(['.scripts', 'build_script']);
    });
  });
});
