import * as yaml from 'js-yaml';

// Custom YAML schema for GitLab CI/CD
export class GitLabYAMLSchema {
  private static instance: GitLabYAMLSchema;
  private schema: yaml.Schema;

  private constructor() {
    this.schema = this.createGitLabSchema();
  }

  public static getInstance(): GitLabYAMLSchema {
    if (!GitLabYAMLSchema.instance) {
      GitLabYAMLSchema.instance = new GitLabYAMLSchema();
    }
    return GitLabYAMLSchema.instance;
  }

  private createGitLabSchema(): yaml.Schema {
    // Create a custom schema that extends the default schema
    const gitlabTypes = [
      // Handle !reference tags
      new yaml.Type('!reference', {
        kind: 'scalar',
        construct: (data: any) => {
          // Return a special object that indicates this is a reference
          return {
            __gitlab_reference: true,
            value: data
          };
        },
        represent: (data: any) => {
          if (data && data.__gitlab_reference) {
            return data.value;
          }
          return data;
        }
      }),
      
      // Handle !reference tags for sequences (arrays)
      new yaml.Type('!reference', {
        kind: 'sequence',
        construct: (data: any) => {
          return {
            __gitlab_reference: true,
            value: data
          };
        },
        represent: (data: any) => {
          if (data && data.__gitlab_reference) {
            return data.value;
          }
          return data;
        }
      }),

      // Handle !reference tags for mappings (objects)
      new yaml.Type('!reference', {
        kind: 'mapping',
        construct: (data: any) => {
          return {
            __gitlab_reference: true,
            value: data
          };
        },
        represent: (data: any) => {
          if (data && data.__gitlab_reference) {
            return data.value;
          }
          return data;
        }
      }),

      // Handle other GitLab-specific tags if needed
      new yaml.Type('!include', {
        kind: 'scalar',
        construct: (data: any) => {
          return {
            __gitlab_include: true,
            value: data
          };
        }
      }),

      new yaml.Type('!include', {
        kind: 'sequence',
        construct: (data: any) => {
          return {
            __gitlab_include: true,
            value: data
          };
        }
      })
    ];

    // Create schema with GitLab types
    return yaml.DEFAULT_SCHEMA.extend(gitlabTypes);
  }

  public getSchema(): yaml.Schema {
    return this.schema;
  }

  public parseYAML(content: string): any {
    return yaml.load(content, { schema: this.schema });
  }

  public stringifyYAML(data: any): string {
    return yaml.dump(data, { schema: this.schema });
  }
}

// Utility functions for working with GitLab references
export class GitLabReferenceResolver {
  /**
   * Check if a value is a GitLab reference
   */
  public static isReference(value: any): boolean {
    return value && typeof value === 'object' && value.__gitlab_reference === true;
  }

  /**
   * Check if a value is a GitLab include
   */
  public static isInclude(value: any): boolean {
    return value && typeof value === 'object' && value.__gitlab_include === true;
  }

  /**
   * Extract the actual value from a GitLab reference
   */
  public static extractValue(value: any): any {
    if (this.isReference(value) || this.isInclude(value)) {
      return value.value;
    }
    return value;
  }

  /**
   * Resolve references in a GitLab job or file
   * This is a basic implementation - you might want to enhance this
   * to actually resolve the references based on the GitLab context
   */
  public static resolveReferences(data: any, context?: any): any {
    if (Array.isArray(data)) {
      return data.map(item => this.resolveReferences(item, context));
    }
    
    if (data && typeof data === 'object') {
      if (this.isReference(data)) {
        // For now, just return the reference as-is
        // In a real implementation, you'd resolve this against the context
        return data;
      }
      
      const resolved: any = {};
      for (const [key, value] of Object.entries(data)) {
        resolved[key] = this.resolveReferences(value, context);
      }
      return resolved;
    }
    
    return data;
  }
}
