export interface GitLabReference {
  __gitlab_reference: true;
  value: any;
}

export interface GitLabInclude {
  __gitlab_include: true;
  value: any;
}

export interface GitLabJob {
  name: string;
  before_script?: string[] | GitLabReference;
  script: string[] | GitLabReference;
  after_script?: string[] | GitLabReference;
  variables?: Record<string, string> | GitLabReference;
  stage?: string;
  needs?: string[] | GitLabReference;
  dependencies?: string[] | GitLabReference;
  rules?: unknown[] | GitLabReference;
  artifacts?: unknown | GitLabReference;
  cache?: unknown | GitLabReference;
  services?: unknown[] | GitLabReference;
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
