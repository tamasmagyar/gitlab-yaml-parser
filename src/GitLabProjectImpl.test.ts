import { GitLabProject, GitLabFile, GitLabJob } from './types';
import { GitLabProjectImpl } from './GitLabProjectImpl';

describe('GitLabProjectImpl', () => {
  let mockProject: GitLabProjectImpl;
  let mockFiles: GitLabFile[];

  beforeEach(() => {
    mockFiles = [
      {
        path: '/project/.gitlab-ci.yml',
        variables: { GLOBAL_VAR: 'global_value' },
        jobs: {
          'build-job': {
            name: 'build-job',
            script: ['npm run build'],
            stage: 'build',
            variables: { BUILD_VAR: 'build_value' }
          },
          'test-job': {
            name: 'test-job',
            script: ['npm test'],
            stage: 'test',
            variables: { TEST_VAR: 'test_value' },
            needs: ['build-job']
          },
          'deploy-job': {
            name: 'deploy-job',
            script: ['npm run deploy'],
            stage: 'deploy',
            variables: { DEPLOY_VAR: 'deploy_value' }
          }
        },
        stages: ['build', 'test', 'deploy']
      },
      {
        path: '/project/.gitlab/includes.yml',
        variables: { INCLUDE_VAR: 'include_value' },
        jobs: {
          'include-job': {
            name: 'include-job',
            script: ['echo "included"'],
            stage: 'test',
            variables: { INCLUDE_JOB_VAR: 'include_job_value' }
          }
        }
      }
    ];

    mockProject = new GitLabProjectImpl(mockFiles);
  });

  describe('getAllJobs', () => {
    it('should return all jobs from all files', () => {
      const allJobs = mockProject.getAllJobs();
      
      expect(allJobs).toHaveLength(4);
      expect(allJobs.map(job => job.name)).toEqual([
        'build-job',
        'test-job', 
        'deploy-job',
        'include-job'
      ]);
    });

    it('should return empty array when no files exist', () => {
      const emptyProject = new GitLabProjectImpl([]);
      const jobs = emptyProject.getAllJobs();
      
      expect(jobs).toEqual([]);
    });

    it('should return empty array when files have no jobs', () => {
      const filesWithoutJobs: GitLabFile[] = [
        {
          path: '/project/empty.yml',
          variables: {},
          jobs: {}
        }
      ];
      const projectWithoutJobs = new GitLabProjectImpl(filesWithoutJobs);
      const jobs = projectWithoutJobs.getAllJobs();
      
      expect(jobs).toEqual([]);
    });
  });

  describe('getJobsByFile', () => {
    it('should return jobs from specific file', () => {
      const jobs = mockProject.getJobsByFile('/project/.gitlab-ci.yml');
      
      expect(jobs).toHaveLength(3);
      expect(jobs.map(job => job.name)).toEqual([
        'build-job',
        'test-job',
        'deploy-job'
      ]);
    });

    it('should return jobs from include file', () => {
      const jobs = mockProject.getJobsByFile('/project/.gitlab/includes.yml');
      
      expect(jobs).toHaveLength(1);
      expect(jobs[0].name).toBe('include-job');
    });

    it('should return empty array for non-existent file', () => {
      const jobs = mockProject.getJobsByFile('/project/non-existent.yml');
      
      expect(jobs).toEqual([]);
    });
  });

  describe('getJobsWithVariable', () => {
    it('should return jobs that have specific variable', () => {
      const jobs = mockProject.getJobsWithVariable('BUILD_VAR');
      
      expect(jobs).toHaveLength(1);
      expect(jobs[0].name).toBe('build-job');
      expect(jobs[0].variables).toBeDefined();
      if (jobs[0].variables && typeof jobs[0].variables === 'object' && !('__gitlab_reference' in jobs[0].variables)) {
        expect((jobs[0].variables as Record<string, string>).BUILD_VAR).toBe('build_value');
      }
    });

    it('should return multiple jobs with same variable', () => {
      // Add another job with TEST_VAR
      const additionalFile: GitLabFile = {
        path: '/project/additional.yml',
        variables: {},
        jobs: {
          'another-test': {
            name: 'another-test',
            script: ['echo "test"'],
            stage: 'test',
            variables: { TEST_VAR: 'another_test_value' }
          }
        }
      };
      
      const extendedProject = new GitLabProjectImpl([...mockFiles, additionalFile]);
      const jobs = extendedProject.getJobsWithVariable('TEST_VAR');
      
      expect(jobs).toHaveLength(2);
      expect(jobs.map(job => job.name)).toEqual(['test-job', 'another-test']);
    });

    it('should return empty array when no jobs have the variable', () => {
      const jobs = mockProject.getJobsWithVariable('NON_EXISTENT_VAR');
      
      expect(jobs).toEqual([]);
    });

    it('should handle jobs without variables', () => {
      const jobsWithoutVars: GitLabFile[] = [
        {
          path: '/project/no-vars.yml',
          variables: {},
          jobs: {
            'no-vars-job': {
              name: 'no-vars-job',
              script: ['echo "no vars"'],
              stage: 'test'
            }
          }
        }
      ];
      
      const projectWithoutVars = new GitLabProjectImpl(jobsWithoutVars);
      const jobs = projectWithoutVars.getJobsWithVariable('ANY_VAR');
      
      expect(jobs).toEqual([]);
    });
  });

  describe('getJobsByStage', () => {
    it('should return jobs from specific stage', () => {
      const testJobs = mockProject.getJobsByStage('test');
      
      expect(testJobs).toHaveLength(2);
      expect(testJobs.map(job => job.name)).toEqual(['test-job', 'include-job']);
    });

    it('should return jobs from build stage', () => {
      const buildJobs = mockProject.getJobsByStage('build');
      
      expect(buildJobs).toHaveLength(1);
      expect(buildJobs[0].name).toBe('build-job');
    });

    it('should return jobs from deploy stage', () => {
      const deployJobs = mockProject.getJobsByStage('deploy');
      
      expect(deployJobs).toHaveLength(1);
      expect(deployJobs[0].name).toBe('deploy-job');
    });

    it('should return empty array for non-existent stage', () => {
      const jobs = mockProject.getJobsByStage('non-existent');
      
      expect(jobs).toEqual([]);
    });

    it('should handle jobs without stage defined', () => {
      const jobsWithoutStage: GitLabFile[] = [
        {
          path: '/project/no-stage.yml',
          variables: {},
          jobs: {
            'no-stage-job': {
              name: 'no-stage-job',
              script: ['echo "no stage"']
            }
          }
        }
      ];
      
      const projectWithoutStage = new GitLabProjectImpl(jobsWithoutStage);
      const jobs = projectWithoutStage.getJobsByStage('any-stage');
      
      expect(jobs).toEqual([]);
    });
  });

  describe('getFileVariables', () => {
    it('should return variables from specific file', () => {
      const variables = mockProject.getFileVariables('/project/.gitlab-ci.yml');
      
      expect(variables).toEqual({ GLOBAL_VAR: 'global_value' });
    });

    it('should return variables from include file', () => {
      const variables = mockProject.getFileVariables('/project/.gitlab/includes.yml');
      
      expect(variables).toEqual({ INCLUDE_VAR: 'include_value' });
    });

    it('should return empty object for non-existent file', () => {
      const variables = mockProject.getFileVariables('/project/non-existent.yml');
      
      expect(variables).toEqual({});
    });

    it('should return empty object for file without variables', () => {
      const filesWithoutVars: GitLabFile[] = [
        {
          path: '/project/no-vars.yml',
          variables: {},
          jobs: {}
        }
      ];
      
      const projectWithoutVars = new GitLabProjectImpl(filesWithoutVars);
      const variables = projectWithoutVars.getFileVariables('/project/no-vars.yml');
      
      expect(variables).toEqual({});
    });

    it('should handle undefined variables', () => {
      const filesWithUndefinedVars: GitLabFile[] = [
        {
          path: '/project/undefined-vars.yml',
          jobs: {}
        }
      ];
      
      const projectWithUndefinedVars = new GitLabProjectImpl(filesWithUndefinedVars);
      const variables = projectWithUndefinedVars.getFileVariables('/project/undefined-vars.yml');
      
      expect(variables).toEqual({});
    });
  });
});
