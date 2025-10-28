export interface GitLabJob {
  name: string;
  before_script?: string[];
  script: string[];
  after_script?: string[];
  variables?: Record<string, string>;
  stage?: string;
  needs?: string[];
  dependencies?: string[];
  rules?: unknown[];
  artifacts?: unknown;
  cache?: unknown;
  services?: unknown[];
  // Add other job properties as needed
}

export interface GitLabFile {
  path: string;
  variables?: Record<string, string>;
  jobs: Record<string, GitLabJob>;
  stages?: string[];
  include?: unknown[];
  // Add other file-level properties
}

export interface GitLabProject {
  files: GitLabFile[];
  getAllJobs(): GitLabJob[];
  getJobsByFile(filePath: string): GitLabJob[];
  getJobsWithVariable(variableName: string): GitLabJob[];
  getJobsByStage(stage: string): GitLabJob[];
  getFileVariables(filePath: string): Record<string, string>;
}
