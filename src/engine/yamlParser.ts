/**
 * Lightweight YAML & JSONC Parser/Serializer for Notes System Configuration Specs
 */

export class YamlParser {
    /**
     * Converts a JavaScript object into a clean, human-readable YAML string.
     */
    public static stringify(obj: any, indent: number = 0): string {
        const spacing = ' '.repeat(indent);
        
        if (obj === null || obj === undefined) return 'null';
        if (typeof obj === 'boolean') return String(obj);
        if (typeof obj === 'number') return String(obj);
        if (typeof obj === 'string') {
            if (obj.includes('\n')) {
                return '|\n' + obj.split('\n').map(l => spacing + '  ' + l).join('\n');
            }
            if (/[#:[\]{},"']/.test(obj) || obj.trim() !== obj) {
                return `"${obj.replace(/"/g, '\\"')}"`;
            }
            return obj;
        }

        if (Array.isArray(obj)) {
            if (obj.length === 0) return '[]';
            return obj.map(item => {
                if (typeof item === 'object' && item !== null) {
                    const itemYaml = this.stringify(item, indent + 2);
                    const lines = itemYaml.trim().split('\n');
                    return `${spacing}- ${lines[0].trim()}\n${lines.slice(1).map(l => spacing + '  ' + l).join('\n')}`.trimEnd();
                } else {
                    return `${spacing}- ${this.stringify(item, 0)}`;
                }
            }).join('\n');
        }

        if (typeof obj === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) return '{}';
            return keys.map(key => {
                const val = obj[key];
                if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                    return `${spacing}${key}:\n${this.stringify(val, indent + 2)}`;
                } else if (Array.isArray(val)) {
                    return `${spacing}${key}:\n${this.stringify(val, indent + 2)}`;
                } else {
                    return `${spacing}${key}: ${this.stringify(val, indent + 2)}`;
                }
            }).join('\n');
        }

        return String(obj);
    }

    /**
     * Parses YAML or JSON/JSONC text into a JavaScript object.
     */
    public static parse(text: string): any {
        const cleaned = text.trim();
        if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
            const jsonWithoutComments = cleaned.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
            return JSON.parse(jsonWithoutComments);
        }
        
        return this.parseSimpleYaml(cleaned);
    }

    private static parseSimpleYaml(yamlStr: string): any {
        try {
            return JSON.parse(yamlStr);
        } catch {
            const result: any = {};
            const lines = yamlStr.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                if (trimmed.includes(':')) {
                    const [k, v] = trimmed.split(':', 2);
                    result[k.trim()] = v ? v.trim() : '';
                }
            }
            return result;
        }
    }
}
