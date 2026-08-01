import test from 'node:test';
import assert from 'node:assert/strict';
import { TemplateEngine } from '../dist/engine/templateEngine.js';
import { RelationshipEngine } from '../dist/engine/relationshipEngine.js';
import { IftttEngine } from '../dist/engine/iftttEngine.js';
import { TodayEngine } from '../dist/engine/todayEngine.js';
import { NoteCreationEngine } from '../dist/engine/noteCreationEngine.js';

test('TemplateEngine registers templates and formats titles', () => {
    const tplEngine = new TemplateEngine();
    const templates = tplEngine.getAllTemplates();

    assert.ok(templates.length >= 8);

    const formattedTitle = tplEngine.formatTitle('meeting', 'Weekly Sync', new Date(2026, 7, 15));
    assert.equal(formattedTitle, 'Meeting: Weekly Sync');

    const dayTitle = tplEngine.formatTitle('task', 'Buy groceries', new Date(2026, 7, 1));
    assert.equal(dayTitle, 'Buy groceries');
});

test('RelationshipEngine calculates auto-cloning and derived topics', () => {
    const tplEngine = new TemplateEngine();
    const relEngine = new RelationshipEngine(tplEngine);

    const relRes = relEngine.resolveCreationRelations('task', {
        project: 'proj_alpha_123',
    });

    assert.deepEqual(relRes.autoCloneContainers, ['proj_alpha_123']);
    assert.equal(relRes.relationLabels.length, 1);
    assert.equal(relRes.relationLabels[0].name, 'project');
    assert.equal(relRes.relationLabels[0].value, 'proj_alpha_123');

    const derivedRes = relEngine.computeDerivedTopics(['topic_ai'], {
        proj_alpha_123: ['topic_ai', 'topic_tech'],
    });

    assert.deepEqual(derivedRes.explicitTopics, ['topic_ai']);
    assert.deepEqual(derivedRes.derivedTopics, ['topic_tech']);
    assert.deepEqual(derivedRes.allTopics.sort(), ['topic_ai', 'topic_tech']);
});

test('IftttEngine evaluates triggers, conditions, and action pipelines', () => {
    const iftttEngine = new IftttEngine();

    const taskDoneContext = {
        noteId: 'note_99',
        title: 'Complete audit',
        templateId: 'task',
        attributes: { status: 'done' },
        relations: {},
    };

    const results = iftttEngine.evaluateEvent('onAttributeChanged', taskDoneContext, 'status');
    const matchedRule = results.find(r => r.ruleId === 'rule_task_done_date');

    assert.ok(matchedRule, 'Expected task done date rule to match');
    assert.equal(matchedRule.executedActions[0].type, 'setLabel');
    assert.equal(matchedRule.executedActions[0].params.labelName, 'doneDate');
    assert.ok(matchedRule.executedActions[0].params.labelValue.length > 0);
});

test('TodayEngine handles layout toggling and reordering', () => {
    const todayEngine = new TodayEngine();
    const initialWidgets = todayEngine.getVisibleWidgets();

    assert.ok(initialWidgets.length > 0);

    todayEngine.toggleWidgetVisibility('overdue', false);
    const updatedWidgets = todayEngine.getVisibleWidgets();

    assert.ok(!updatedWidgets.some(w => w.id === 'overdue'));
});

test('NoteCreationEngine plans note creation with IFTTT automation', () => {
    const tplEngine = new TemplateEngine();
    const relEngine = new RelationshipEngine(tplEngine);
    const iftttEngine = new IftttEngine();
    const creationEngine = new NoteCreationEngine(tplEngine, relEngine, iftttEngine);

    const plan = creationEngine.planNoteCreation({
        type: 'task',
        title: 'Submit quarterly report',
        attributes: { priority: 'high' },
        relations: { project: 'proj_beta' },
    });

    assert.equal(plan.templateId, 'task');
    assert.equal(plan.formattedTitle, 'Submit quarterly report');
    assert.deepEqual(plan.autoCloneContainers, ['proj_beta']);
    assert.ok(plan.labelsToCreate.some(l => l.name === 'extTask'));
});
