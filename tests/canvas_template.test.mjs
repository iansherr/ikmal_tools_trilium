import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TemplateEngine } from '../dist/engine/templateEngine.js';
import { NoteCreationEngine } from '../dist/engine/noteCreationEngine.js';
import { RelationshipEngine } from '../dist/engine/relationshipEngine.js';

import { IfThenRuleEngine } from '../dist/engine/ifThenRuleEngine.js';
import { SettingsEngine } from '../dist/engine/settingsEngine.js';

test('NoteCreationEngine plans native canvas (Excalidraw) note creation with noteType', () => {
    const templateEngine = new TemplateEngine();
    const relEngine = new RelationshipEngine(templateEngine);
    const ifThenEngine = new IfThenRuleEngine();
    const settingsEngine = new SettingsEngine();
    const creationEngine = new NoteCreationEngine(templateEngine, relEngine, ifThenEngine, settingsEngine);

    const canvasTemplate = templateEngine.getTemplate('canvas');
    assert.ok(canvasTemplate);
    assert.equal(canvasTemplate.noteType, 'canvas');

    const plan = creationEngine.planNoteCreation({
        type: 'canvas',
        title: 'System Architecture Whiteboard',
        attributes: {
            diagramType: 'architecture',
            status: 'draft',
        },
        relations: {
            project: 'project_123',
        },
    });

    assert.equal(plan.templateId, 'canvas');
    assert.equal(plan.noteType, 'canvas');
    assert.equal(plan.formattedTitle, 'System Architecture Whiteboard (Diagram)');
    assert.equal(plan.rootContainerMarker, 'canvasRoot');

    // Verify Project Hub relation and auto-cloning
    const projRel = plan.relationsToCreate.find(r => r.name === 'project');
    assert.ok(projRel);
    assert.equal(projRel.value, 'project_123');

    const autoClone = plan.autoCloneContainers;
    assert.ok(autoClone.includes('project_123'));
});
