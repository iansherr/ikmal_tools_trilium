/* Restore the Journal branches which the capture workflow created today. */

const dayNote = api.originEntity;
if (!dayNote || !dayNote.hasOwnedLabel('dateNote')) {
    return;
}

const day = dayNote.getOwnedLabelValue('dateNote');
const sources = [
    ['extTask'],
    ['extMeeting'],
    ['extStoryDraft'],
    ['extReportingNotes'],
    ['extEmailDraft'],
    ['extScratch'],
    ['noteGroup', 'people'],
    ['noteGroup', 'organization'],
];
const candidates = new Map();

for (const [name, value] of sources) {
    for (const note of api.getNotesWithLabel(name, value)) {
        candidates.set(note.noteId, note);
    }
}

for (const note of candidates.values()) {
    if (api.dayjs(note.dateCreated).format('YYYY-MM-DD') !== day) {
        continue;
    }
    api.ensureNoteIsPresentInParent(note.noteId, dayNote.noteId, '');
}
