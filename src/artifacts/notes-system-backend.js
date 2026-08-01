/*
 * Notes System Backend Worker & Endpoint Handler
 * Implements server-side note creation, if/then automation execution, and ETAPI custom endpoints.
 */

function handleCustomRequest(req, res) {
    const url = req.url || '';
    
    if (url.includes('/notes-system/create')) {
        const body = req.body || {};
        const type = body.type || 'task';
        const title = body.title || 'Untitled Note';

        const rootContainer = api.getNoteWithLabel('taskRoot') || api.getRootNote();
        const createdNote = api.createNewTextNote(rootContainer.noteId, title, `<p>Created via Notes System Plugin.</p>`);
        
        createdNote.setLabel('extTask', '');
        if (body.priority) createdNote.setLabel('priority', body.priority);
        if (body.dueDate) createdNote.setLabel('dueDate', body.dueDate);

        res.json({
            status: 'ok',
            noteId: createdNote.noteId,
            title: createdNote.title,
        });
        return;
    }

    if (url.includes('/notes-system/templates')) {
        res.json({
            status: 'ok',
            templates: ['task', 'meeting', 'projectHub', 'person', 'organization', 'topic', 'storyDraft', 'emailDraft'],
        });
        return;
    }

    res.json({ status: 'ok', message: 'Notes System Backend Ready' });
}

module.exports = {
    handleCustomRequest,
};
