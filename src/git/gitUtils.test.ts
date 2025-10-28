import * as path from 'path';
import { GitUtils } from './gitUtils';

describe('GitUtils', () => {
  describe('findGitRoot', () => {
    it('should find Git root from current directory', () => {
      const gitRoot = GitUtils.findGitRoot();

      expect(gitRoot).toBeDefined();
      expect(typeof gitRoot).toBe('string');
      expect(GitUtils.isGitRepository(gitRoot)).toBe(true);
    });

    it('should find Git root from subdirectory', () => {
      const subDir = path.join(__dirname, 'fixtures');
      const gitRoot = GitUtils.findGitRoot(subDir);

      expect(gitRoot).toBeDefined();
      expect(typeof gitRoot).toBe('string');
      expect(GitUtils.isGitRepository(gitRoot)).toBe(true);
    });

    it('should return current working directory if no Git repo found', () => {
      const nonGitDir = '/tmp/non-git-directory';
      const result = GitUtils.findGitRoot(nonGitDir);

      expect(result).toBe(process.cwd());
    });

    it('should handle relative paths correctly', () => {
      const relativePath = './src';
      const gitRoot = GitUtils.findGitRoot(relativePath);

      expect(gitRoot).toBeDefined();
      expect(typeof gitRoot).toBe('string');
    });
  });

  describe('isGitRepository', () => {
    it('should return true for Git repository root', () => {
      const gitRoot = GitUtils.findGitRoot();
      expect(GitUtils.isGitRepository(gitRoot)).toBe(true);
    });

    it('should return false for non-Git directory', () => {
      const nonGitDir = '/tmp/non-git-directory';
      expect(GitUtils.isGitRepository(nonGitDir)).toBe(false);
    });

    it('should return false for subdirectory of Git repo', () => {
      const gitRoot = GitUtils.findGitRoot();
      const subDir = path.join(gitRoot, 'src');
      expect(GitUtils.isGitRepository(subDir)).toBe(false);
    });
  });
});
