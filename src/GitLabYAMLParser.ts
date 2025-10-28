import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { glob } from 'glob';
import { GitLabFile, GitLabJob, GitLabProject } from './types';
import { GitLabProjectImpl } from './GitLabProjectImpl';
import { GitLabYAMLSchema, GitLabReferenceResolver } from './GitLabYAMLSchema';

export class GitLabYAMLParser {
  private projectPath: string;
  private yamlSchema: GitLabYAMLSchema;

  constructor(projectPath: string = process.cwd()) {
    this.projectPath = projectPath;
    this.yamlSchema = GitLabYAMLSchema.getInstance();
  }

  async parseProject(): Promise<GitLabProject> {
    const files = await this.findGitLabFiles();
    const parsedFiles: GitLabFile[] = [];
 
    for (const filePath of files) {
      try {
        const file = await this.parseFile(filePath);
        parsedFiles.push(file);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn(`Failed to parse ${filePath}:`, error);
      }
    }

    return new GitLabProjectImpl(parsedFiles);
  }

  private async findGitLabFiles(): Promise<string[]> {
    const patterns = [
      '.gitlab-ci.yml',
      '.gitlab/**/*.yml'
    ];

    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      const files = await glob(pattern, { 
        cwd: this.projectPath,
        absolute: true 
      });
      allFiles.push(...files);
    }

    return [...new Set(allFiles)]; // Remove duplicates
  }

  private async parseFile(filePath: string): Promise<GitLabFile> {
    const content = fs.readFileSync(filePath, 'utf8');
    const yamlContent = this.yamlSchema.parseYAML(content) as Record<string, unknown>;

    if (!yamlContent || typeof yamlContent !== 'object') {
      throw new Error(`Invalid YAML content in ${filePath}`);
    }

    const jobs: Record<string, GitLabJob> = {};
    
    // Extract jobs
    for (const [key, value] of Object.entries(yamlContent)) {
      if (key.startsWith('.') || key === 'variables' || key === 'stages' || key === 'include') {
        continue; // Skip hidden jobs, variables, stages, includes
      }
      
      if (typeof value === 'object' && value !== null) {
        const job = this.parseJob(key, value as Record<string, unknown>);
        jobs[key] = job;
      }
    }

    return {
      path: filePath,
      variables: (yamlContent.variables as Record<string, string>) || {},
      jobs,
      stages: yamlContent.stages as string[] | undefined,
      include: yamlContent.include as unknown[] | undefined
    };
  }

  private parseJob(name: string, jobData: Record<string, unknown>): GitLabJob {
    return {
      name,
      before_script: jobData.before_script as string[] | undefined,
      script: (jobData.script as string[]) || [],
      after_script: jobData.after_script as string[] | undefined,
      variables: (jobData.variables as Record<string, string>) || {},
      stage: jobData.stage as string | undefined,
      needs: jobData.needs as string[] | undefined,
      dependencies: jobData.dependencies as string[] | undefined,
      rules: jobData.rules as unknown[] | undefined,
      artifacts: jobData.artifacts as unknown | undefined,
      cache: jobData.cache as unknown | undefined,
      services: jobData.services as unknown[] | undefined
    };
  }

  /**
   * Check if a value is a GitLab reference
   */
  public isReference(value: any): boolean {
    return GitLabReferenceResolver.isReference(value);
  }

  /**
   * Check if a value is a GitLab include
   */
  public isInclude(value: any): boolean {
    return GitLabReferenceResolver.isInclude(value);
  }

  /**
   * Extract the actual value from a GitLab reference
   */
  public extractReferenceValue(value: any): any {
    return GitLabReferenceResolver.extractValue(value);
  }

  /**
   * Resolve references in a GitLab job or file
   */
  public resolveReferences(data: any, context?: any): any {
    return GitLabReferenceResolver.resolveReferences(data, context);
  }
}
