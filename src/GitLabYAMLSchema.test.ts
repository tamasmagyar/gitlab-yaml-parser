import { GitLabYAMLSchema, GitLabReferenceResolver } from './GitLabYAMLSchema';

describe('GitLabYAMLSchema', () => {
  let schema: GitLabYAMLSchema;

  beforeEach(() => {
    schema = GitLabYAMLSchema.getInstance();
  });

  describe('!reference tag parsing', () => {
    it('should parse scalar !reference tags', () => {
      const yamlContent = `
test_job:
  script: !reference [.scripts, build_script]
`;
      
      const result = schema.parseYAML(yamlContent);
      
      expect(result.test_job.script).toBeDefined();
      expect(result.test_job.script.__gitlab_reference).toBe(true);
      expect(result.test_job.script.value).toEqual(['.scripts', 'build_script']);
    });

    it('should parse sequence !reference tags', () => {
      const yamlContent = `
test_job:
  script: !reference [.scripts, build_script]
  variables: !reference [.variables, test_vars]
`;
      
      const result = schema.parseYAML(yamlContent);
      
      expect(result.test_job.script.__gitlab_reference).toBe(true);
      expect(result.test_job.variables.__gitlab_reference).toBe(true);
    });

    it('should parse mapping !reference tags', () => {
      const yamlContent = `
test_job:
  rules: !reference [.rules, main_rules]
`;
      
      const result = schema.parseYAML(yamlContent);
      
      expect(result.test_job.rules.__gitlab_reference).toBe(true);
      expect(result.test_job.rules.value).toEqual(['.rules', 'main_rules']);
    });

    it('should handle !include tags', () => {
      const yamlContent = `
include:
  - !include local.yml
  - !include remote.yml
`;
      
      const result = schema.parseYAML(yamlContent);
      
      expect(result.include).toBeDefined();
      expect(Array.isArray(result.include)).toBe(true);
    });
  });

  describe('stringifyYAML', () => {
    it('should stringify references correctly', () => {
      const data = {
        test_job: {
          script: {
            __gitlab_reference: true,
            value: ['.scripts', 'build_script']
          }
        }
      };
      
      const yamlString = schema.stringifyYAML(data);
      // The stringify method preserves the reference structure
      expect(yamlString).toContain('__gitlab_reference: true');
      expect(yamlString).toContain('.scripts');
    });
  });
});

describe('GitLabReferenceResolver', () => {
  describe('isReference', () => {
    it('should identify GitLab references', () => {
      const reference = {
        __gitlab_reference: true,
        value: ['.scripts', 'build_script']
      };
      
      expect(GitLabReferenceResolver.isReference(reference)).toBe(true);
    });

    it('should not identify non-references as references', () => {
      const normalValue = ['echo "hello"'];
      const normalObject = { script: ['echo "hello"'] };
      
      expect(GitLabReferenceResolver.isReference(normalValue)).toBe(false);
      expect(GitLabReferenceResolver.isReference(normalObject)).toBe(false);
    });
  });

  describe('isInclude', () => {
    it('should identify GitLab includes', () => {
      const include = {
        __gitlab_include: true,
        value: 'local.yml'
      };
      
      expect(GitLabReferenceResolver.isInclude(include)).toBe(true);
    });

    it('should not identify non-includes as includes', () => {
      const normalValue = 'local.yml';
      const reference = {
        __gitlab_reference: true,
        value: ['.scripts', 'build_script']
      };
      
      expect(GitLabReferenceResolver.isInclude(normalValue)).toBe(false);
      expect(GitLabReferenceResolver.isInclude(reference)).toBe(false);
    });
  });

  describe('extractValue', () => {
    it('should extract value from references', () => {
      const reference = {
        __gitlab_reference: true,
        value: ['.scripts', 'build_script']
      };
      
      const extracted = GitLabReferenceResolver.extractValue(reference);
      expect(extracted).toEqual(['.scripts', 'build_script']);
    });

    it('should extract value from includes', () => {
      const include = {
        __gitlab_include: true,
        value: 'local.yml'
      };
      
      const extracted = GitLabReferenceResolver.extractValue(include);
      expect(extracted).toBe('local.yml');
    });

    it('should return normal values unchanged', () => {
      const normalValue = ['echo "hello"'];
      const extracted = GitLabReferenceResolver.extractValue(normalValue);
      expect(extracted).toBe(normalValue);
    });
  });

  describe('resolveReferences', () => {
    it('should resolve references in arrays', () => {
      const data = [
        {
          __gitlab_reference: true,
          value: ['.scripts', 'build_script']
        },
        'normal_value'
      ];
      
      const resolved = GitLabReferenceResolver.resolveReferences(data);
      expect(resolved).toEqual([
        {
          __gitlab_reference: true,
          value: ['.scripts', 'build_script']
        },
        'normal_value'
      ]);
    });

    it('should resolve references in objects', () => {
      const data = {
        job1: {
          script: {
            __gitlab_reference: true,
            value: ['.scripts', 'build_script']
          },
          variables: {
            NODE_VERSION: '18'
          }
        }
      };
      
      const resolved = GitLabReferenceResolver.resolveReferences(data);
      expect(resolved.job1.script.__gitlab_reference).toBe(true);
      expect(resolved.job1.variables.NODE_VERSION).toBe('18');
    });

    it('should handle nested references', () => {
      const data = {
        jobs: {
          build: {
            script: {
              __gitlab_reference: true,
              value: ['.scripts', 'build_script']
            }
          }
        }
      };
      
      const resolved = GitLabReferenceResolver.resolveReferences(data);
      expect(resolved.jobs.build.script.__gitlab_reference).toBe(true);
    });
  });
});
