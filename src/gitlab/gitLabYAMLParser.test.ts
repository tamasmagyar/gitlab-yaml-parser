import * as path from 'path';
import { GitLabYAMLParser } from './gitLabYAMLParser';

describe('GitLabYAMLParser', () => {
  const FIXTURES = path.join(__dirname, '../../fixtures');
  const TEST_PROJECT = path.join(FIXTURES, 'test-project');

  describe('constructor', () => {
    it('should detect Git repository root by default', () => {
      const gitlabYAMLParser = new GitLabYAMLParser();
      expect(gitlabYAMLParser).toBeInstanceOf(GitLabYAMLParser);
      expect(gitlabYAMLParser.getProjectPath()).toBeDefined();
      expect(gitlabYAMLParser.isGitRepository()).toBe(true);
    });

    it('should accept custom project path', () => {
      const customPath = '/custom/path';
      const gitlabYAMLParser = new GitLabYAMLParser(customPath);
      expect(gitlabYAMLParser).toBeInstanceOf(GitLabYAMLParser);
      expect(gitlabYAMLParser.getProjectPath()).toBe(customPath);
    });

    it('should fall back to current working directory if no Git repo found', () => {
      const nonGitPath = '/tmp/non-git-directory';
      const gitlabYAMLParser = new GitLabYAMLParser(nonGitPath);

      expect(gitlabYAMLParser.getProjectPath()).toBe(nonGitPath);
      expect(gitlabYAMLParser.isGitRepository()).toBe(false);
    });
  });

  describe('parseProject', () => {
    it('should parse a GitLab project with valid YAML files', async () => {
      const gitlabYAMLParser = new GitLabYAMLParser(TEST_PROJECT);
      const project = await gitlabYAMLParser.parseProject();

      expect(project).toBeDefined();
      expect(project.files).toBeInstanceOf(Array);
      expect(project.getAllJobs).toBeInstanceOf(Function);
      expect(project.getJobsByFile).toBeInstanceOf(Function);
      expect(project.getJobsWithVariable).toBeInstanceOf(Function);
      expect(project.getJobsByStage).toBeInstanceOf(Function);
      expect(project.getFileVariables).toBeInstanceOf(Function);
    });

    it('should handle projects with no GitLab files', async () => {
      const emptyDir = path.join(FIXTURES, 'empty');
      const emptyParser = new GitLabYAMLParser(emptyDir);

      const project = await emptyParser.parseProject();
      expect(project.files).toEqual([]);
      expect(project.getAllJobs()).toEqual([]);
    });

    it('should skip invalid YAML files and continue parsing', async () => {
      const gitlabYAMLParser = new GitLabYAMLParser(TEST_PROJECT);
      const project = await gitlabYAMLParser.parseProject();

      expect(project).toBeDefined();
      expect(project.files).toBeInstanceOf(Array);
    });
  });

  describe('public methods', () => {
    describe('findGitLabFiles', () => {
      it('should find .gitlab-ci.yml file in test-project', async () => {
        const gitlabYAMLParser = new GitLabYAMLParser(TEST_PROJECT);
        const files = await gitlabYAMLParser.findGitLabFiles();

        expect(files).toBeInstanceOf(Array);
        expect(files.some((file: string) => file.includes('.gitlab-ci.yml'))).toBe(true);
      });

      it('should find files in .gitlab directory in test-project', async () => {
        const gitlabYAMLParser = new GitLabYAMLParser(TEST_PROJECT);
        const files = await gitlabYAMLParser.findGitLabFiles();

        expect(files.some((file: string) => file.includes('.gitlab/'))).toBe(true);
        expect(files.length).toBe(2);
      });

      it('should remove duplicate files', async () => {
        const gitlabYAMLParser = new GitLabYAMLParser(TEST_PROJECT);
        const files = await gitlabYAMLParser.findGitLabFiles();

        const uniqueFiles = Array.from(new Set(files));
        expect(files.length).toBe(uniqueFiles.length);
      });
    });

    describe('parseProject', () => {
      it('should parse a valid GitLab YAML file', async () => {
        const gitlabYAMLParser = new GitLabYAMLParser(TEST_PROJECT);
        const project = await gitlabYAMLParser.parseProject();

        expect(project.files).toBeDefined();
        expect(project.files.length).toBeGreaterThan(0);

        const gitlabFile = project.files.find(file => file.path.includes('.gitlab-ci.yml'));
        expect(gitlabFile).toBeDefined();
        expect(gitlabFile?.jobs).toBeInstanceOf(Object);
        expect(gitlabFile?.variables).toBeInstanceOf(Object);
      });

      it('should handle invalid YAML content gracefully', async () => {
        // Create a parser with a directory containing invalid YAML
        const invalidDir = path.join(FIXTURES, 'yml-files');
        const gitlabYAMLParser = new GitLabYAMLParser(invalidDir);

        // parseProject should not throw, but should skip invalid files
        const project = await gitlabYAMLParser.parseProject();
        expect(project).toBeDefined();
        expect(project.files).toBeInstanceOf(Array);
      });

      it('should skip hidden jobs and special keys', async () => {
        const gitlabYAMLParser = new GitLabYAMLParser(TEST_PROJECT);
        const project = await gitlabYAMLParser.parseProject();

        // Check that no hidden jobs (starting with '.') are included
        const allJobs = project.getAllJobs();
        const hiddenJobs = allJobs.filter(job => job.name.startsWith('.'));
        expect(hiddenJobs).toHaveLength(0);

        // Check that special keys like 'variables', 'stages', 'include' are not treated as jobs
        const specialKeys = ['variables', 'stages', 'include'];
        const specialJobs = allJobs.filter(job => specialKeys.includes(job.name));
        expect(specialJobs).toHaveLength(0);
      });
    });
  });
});
