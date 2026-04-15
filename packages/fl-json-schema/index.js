"use strict";
// FreeLang v9 Package: fl-json-schema
// JSON 스키마 검증 패키지
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
exports.buildSchema = buildSchema;
exports.registerFlJsonSchema = registerFlJsonSchema;
function validate(data, schema, path = "$") {
    const errors = [];
    // type 검사
    if (schema.type !== undefined) {
        const actualType = getJsonType(data);
        if (schema.type !== actualType) {
            errors.push(`${path}: expected type '${schema.type}', got '${actualType}'`);
            return { valid: false, errors };
        }
    }
    // null 값이면 나머지 검사 스킵
    if (data === null)
        return { valid: errors.length === 0, errors };
    // string 검사
    if (typeof data === "string") {
        if (schema.minLength !== undefined && data.length < schema.minLength) {
            errors.push(`${path}: string length ${data.length} < minLength ${schema.minLength}`);
        }
        if (schema.maxLength !== undefined && data.length > schema.maxLength) {
            errors.push(`${path}: string length ${data.length} > maxLength ${schema.maxLength}`);
        }
        if (schema.pattern !== undefined) {
            const re = new RegExp(schema.pattern);
            if (!re.test(data)) {
                errors.push(`${path}: string does not match pattern '${schema.pattern}'`);
            }
        }
    }
    // number 검사
    if (typeof data === "number") {
        if (schema.minimum !== undefined && data < schema.minimum) {
            errors.push(`${path}: value ${data} < minimum ${schema.minimum}`);
        }
        if (schema.maximum !== undefined && data > schema.maximum) {
            errors.push(`${path}: value ${data} > maximum ${schema.maximum}`);
        }
    }
    // enum 검사
    if (schema.enum !== undefined) {
        const found = schema.enum.some((v) => JSON.stringify(v) === JSON.stringify(data));
        if (!found) {
            errors.push(`${path}: value not in enum [${schema.enum.map((v) => JSON.stringify(v)).join(", ")}]`);
        }
    }
    // array 검사
    if (Array.isArray(data)) {
        if (schema.items !== undefined) {
            data.forEach((item, i) => {
                const res = validate(item, schema.items, `${path}[${i}]`);
                errors.push(...res.errors);
            });
        }
    }
    // object 검사
    if (typeof data === "object" && !Array.isArray(data) && data !== null) {
        // required 검사
        if (schema.required !== undefined) {
            for (const key of schema.required) {
                if (!(key in data)) {
                    errors.push(`${path}: missing required field '${key}'`);
                }
            }
        }
        // properties 검사
        if (schema.properties !== undefined) {
            for (const [key, propSchema] of Object.entries(schema.properties)) {
                if (key in data) {
                    const res = validate(data[key], propSchema, `${path}.${key}`);
                    errors.push(...res.errors);
                }
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
function getJsonType(value) {
    if (value === null)
        return "null";
    if (Array.isArray(value))
        return "array";
    return typeof value;
}
function buildSchema(type, opts = {}) {
    return { type, ...opts };
}
function registerFlJsonSchema(registry) {
    registry["schema-validate"] = (data, schema) => validate(data, schema);
    registry["schema-build"] = (type, opts) => buildSchema(type, opts);
}
//# sourceMappingURL=index.js.map