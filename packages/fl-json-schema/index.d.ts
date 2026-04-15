export interface SchemaNode {
    type?: "string" | "number" | "boolean" | "array" | "object" | "null";
    required?: string[];
    properties?: Record<string, SchemaNode>;
    items?: SchemaNode;
    minLength?: number;
    maxLength?: number;
    minimum?: number;
    maximum?: number;
    enum?: any[];
    pattern?: string;
    additionalProperties?: boolean | SchemaNode;
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
export declare function validate(data: any, schema: SchemaNode, path?: string): ValidationResult;
export declare function buildSchema(type: SchemaNode["type"], opts?: Omit<SchemaNode, "type">): SchemaNode;
export declare function registerFlJsonSchema(registry: any): void;
//# sourceMappingURL=index.d.ts.map