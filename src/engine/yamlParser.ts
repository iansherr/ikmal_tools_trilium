/**
 * Lightweight YAML & JSONC Parser/Serializer for Notes System Configuration Specs
 *
 * This handles the subset {@link YamlParser.stringify} emits — nested maps, lists of
 * maps or scalars, scalars, and `|` block scalars — which is everything the package
 * specification uses. It is not a general YAML implementation: no anchors, flow
 * collections, multiple documents, or tags.
 */

type Scalar = string | number | boolean | null;

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
            if (obj === '' || /[#:[\]{},"']/.test(obj) || obj.trim() !== obj) {
                return `"${obj.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
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
                if (val !== null && typeof val === 'object') {
                    const nested = this.stringify(val, indent + 2);
                    // An empty collection stays on the key's own line.
                    return nested === '[]' || nested === '{}'
                        ? `${spacing}${key}: ${nested}`
                        : `${spacing}${key}:\n${nested}`;
                }
                return `${spacing}${key}: ${this.stringify(val, indent + 2)}`;
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

        const lines = cleaned.split('\n');
        const [value] = this.parseBlock(lines, 0, 0);
        return value;
    }

    /**
     * Parses the block starting at `start` whose entries are indented by at least
     * `indent`, returning the value and the line after the block.
     */
    private static parseBlock(lines: string[], start: number, indent: number): [any, number] {
        let i = this.skipBlank(lines, start);
        if (i >= lines.length) return [null, i];

        return this.indentOf(lines[i]) >= indent && lines[i].trim().startsWith('- ')
            ? this.parseList(lines, i, this.indentOf(lines[i]))
            : this.parseMap(lines, i, this.indentOf(lines[i]));
    }

    private static parseMap(lines: string[], start: number, indent: number): [Record<string, any>, number] {
        const result: Record<string, any> = {};
        let i = start;

        while (i < lines.length) {
            const next = this.skipBlank(lines, i);
            if (next >= lines.length) { i = next; break; }

            const line = lines[next];
            const lineIndent = this.indentOf(line);
            // Dedent ends this map; a deeper line belongs to a value handled below.
            if (lineIndent < indent) break;

            const trimmed = line.trim();
            const separator = this.findKeySeparator(trimmed);
            if (separator < 0) break;

            const key = this.unquote(trimmed.slice(0, separator).trim());
            const inline = trimmed.slice(separator + 1).trim();
            i = next + 1;

            if (inline === '|' || inline === '|-') {
                const [text, after] = this.parseBlockScalar(lines, i, indent);
                result[key] = inline === '|' ? text : text.replace(/\n+$/, '');
                i = after;
            } else if (inline === '') {
                const child = this.skipBlank(lines, i);
                if (child < lines.length && this.indentOf(lines[child]) > indent) {
                    const [value, after] = this.parseBlock(lines, child, this.indentOf(lines[child]));
                    result[key] = value;
                    i = after;
                } else {
                    result[key] = null;
                }
            } else if (inline === '[]') {
                result[key] = [];
            } else if (inline === '{}') {
                result[key] = {};
            } else {
                result[key] = this.parseScalar(inline);
            }
        }

        return [result, i];
    }

    private static parseList(lines: string[], start: number, indent: number): [any[], number] {
        const result: any[] = [];
        let i = start;

        while (i < lines.length) {
            const next = this.skipBlank(lines, i);
            if (next >= lines.length) { i = next; break; }

            const line = lines[next];
            if (this.indentOf(line) !== indent || !line.trim().startsWith('- ')) break;

            const first = line.trim().slice(2).trim();
            i = next + 1;

            if (this.findKeySeparator(first) < 0) {
                // A plain scalar item.
                result.push(this.parseScalar(first));
                continue;
            }

            // A map item: its first pair is on the dash line, the rest are indented to
            // where that pair starts.
            const itemIndent = this.indentOf(line) + 2;
            const [head] = this.parseMap([' '.repeat(itemIndent) + first], 0, itemIndent);

            const rest = this.skipBlank(lines, i);
            if (rest < lines.length && this.indentOf(lines[rest]) >= itemIndent && !lines[rest].trim().startsWith('- ')) {
                const [tail, after] = this.parseMap(lines, rest, itemIndent);
                Object.assign(head, tail);
                i = after;
            }

            result.push(head);
        }

        return [result, i];
    }

    /** Collects the lines of a `|` block, which run until the indentation drops back. */
    private static parseBlockScalar(lines: string[], start: number, indent: number): [string, number] {
        const collected: string[] = [];
        let i = start;
        let contentIndent = -1;

        while (i < lines.length) {
            const line = lines[i];
            if (line.trim() === '') {
                collected.push('');
                i++;
                continue;
            }
            if (this.indentOf(line) <= indent) break;
            if (contentIndent < 0) contentIndent = this.indentOf(line);
            collected.push(line.slice(contentIndent));
            i++;
        }

        // Trailing blank lines belong to the separation before the next key.
        while (collected.length && collected[collected.length - 1] === '') collected.pop();
        return [collected.join('\n'), i];
    }

    /**
     * Index of the `:` that ends the key, or -1 when the text is not a mapping.
     * Skips colons inside quotes so a quoted key or URL does not split early.
     */
    private static findKeySeparator(text: string): number {
        let quote: string | null = null;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (quote) {
                if (ch === '\\') i++;
                else if (ch === quote) quote = null;
            } else if (ch === '"' || ch === "'") {
                quote = ch;
            } else if (ch === ':' && (i + 1 === text.length || text[i + 1] === ' ')) {
                return i;
            }
        }
        return -1;
    }

    private static parseScalar(raw: string): Scalar {
        // A trailing comment only counts outside quotes.
        const text = raw.startsWith('"') || raw.startsWith("'") ? raw : raw.split(' #')[0].trim();

        if (text === '' || text === 'null' || text === '~') return null;
        if (text === 'true') return true;
        if (text === 'false') return false;
        if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
        return this.unquote(text);
    }

    private static unquote(text: string): string {
        if (text.length >= 2 && ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'")))) {
            return text.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        return text;
    }

    private static indentOf(line: string): number {
        return line.length - line.trimStart().length;
    }

    /** Index of the next line that carries content, skipping blanks and comments. */
    private static skipBlank(lines: string[], from: number): number {
        let i = from;
        while (i < lines.length && (lines[i].trim() === '' || lines[i].trim().startsWith('#'))) i++;
        return i;
    }
}
