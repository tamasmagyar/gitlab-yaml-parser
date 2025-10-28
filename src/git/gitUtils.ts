import * as fs from 'fs';
import * as path from 'path';

/**
 * Git utility functions
 */
export class GitUtils {
  /**
   * Find the Git repository root directory
   * @param startPath - The path to start searching from (defaults to current working directory)
   * @returns The path to the Git repository root, or current working directory if not found
   */
  static findGitRoot(startPath: string = process.cwd()): string {
    let currentPath = path.resolve(startPath);

    while (currentPath !== path.dirname(currentPath)) {
      const gitPath = path.join(currentPath, '.git');
      if (fs.existsSync(gitPath)) {
        return currentPath;
      }
      currentPath = path.dirname(currentPath);
    }

    // If no Git repository found, fall back to current working directory
    return process.cwd();
  }

  /**
   * Check if a given path is a Git repository root
   * @param path - The path to check
   * @returns True if the path contains a .git directory
   */
  static isGitRepository(pathToCheck: string): boolean {
    const gitPath = path.join(pathToCheck, '.git');
    return fs.existsSync(gitPath);
  }
}
