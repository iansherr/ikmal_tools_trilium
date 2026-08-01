import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TemplateEngine } from '../dist/engine/templateEngine.js';
import { NoteCreationEngine } from '../dist/engine/noteCreationEngine.js';
import { RelationshipEngine } from '../dist/engine/relationshipEngine.js';
import { IfThenRuleEngine } from '../dist/engine/ifThenRuleEngine.js';

test('Rapid-fire load benchmark: instantiates 50 notes cleanly with rules and relationships', () => {
    const templateEngine = new TemplateEngine();
    const relEngine = new RelationshipEngine(templateEngine);
    const ifThenEngine = new IfThenRuleEngine();

    // Register a custom rule
    ifThenEngine.registerRule({
        id: 'rule_load_test',
        name: 'Auto High Priority on Urgent Task',
        event: 'onNoteCreated',
        conditions: [{ field: 'title', operator: 'contains', value: 'Urgent' }],
        actions: [{ type: 'archiveNote', params: {} }],
        enabled: true,
    });

    const creationEngine = new NoteCreationEngine(templateEngine, relEngine, ifThenEngine);

    const startTime = performance.now();
    const plans = [];

    for (let i = 0; i < 50; i++) {
        const plan = creationEngine.planNoteCreation({
            type: i % 2 === 0 ? 'task' : 'meeting',
            title: i % 5 === 0 ? `Urgent Task ${i}` : `Routine Work ${i}`,
            attributes: {
                priority: 'medium',
                status: 'todo',
            },
            relations: {
                project: `proj_${i % 3}`,
            },
        });
        plans.push(plan);
    }

    const durationMs = performance.now() - startTime;

    assert.equal(plans.length, 50);
    assert.ok(durationMs < 500, `Expected 50 note plans generated in under 500ms, took ${durationMs.toFixed(2)}ms`);

    // Verify urgent rules triggered
    const urgentPlans = plans.filter(p => p.formattedTitle.includes('Urgent'));
    assert.ok(urgentPlans.length > 0);
    for (const p of urgentPlans) {
        assert.ok(p.labelsToCreate.some(l => l.name === 'archived'));
    }
});
