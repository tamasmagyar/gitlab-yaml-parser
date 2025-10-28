import { GitLabFile, GitLabJob, GitLabProject } from './types';

export class GitLabProjectImpl implements GitLabProject {
  constructor(public files: GitLabFile[]) {}

  getAllJobs(): GitLabJob[] {
    return this.files.flatMap(file => Object.values(file.jobs));
  }

  getJobsByFile(filePath: string): GitLabJob[] {
    const file = this.files.find(f => f.path === filePath);
    return file ? Object.values(file.jobs) : [];
  }

  getJobsWithVariable(variableName: string): GitLabJob[] {
    return this.getAllJobs().filter(job => 
      job.variables && variableName in job.variables
    );
  }

  getJobsByStage(stage: string): GitLabJob[] {
    return this.getAllJobs().filter(job => job.stage === stage);
  }

  getFileVariables(filePath: string): Record<string, string> {
    const file = this.files.find(f => f.path === filePath);
    return file ? file.variables || {} : {};
  }
}
