/*
 * Keep project metadata relations aligned when a user edits a Project Hub,
 * Story Draft, or Reporting Notes note directly. Keep managed Reporting Notes
 * titles aligned with their Project Hub without overwriting a user rename.
 *
 * This hook is intentionally narrow. It does not create notes, search the
 * database, or touch status/content fields. It copies only a relation when
 * the event's origin note has an actual value, so unrelated edits cannot
 * erase metadata. Every write is conditional, which makes the follow-up
 * change events converge without recursive write churn.
 */

const originEntity = api.originEntity;
if (!originEntity || !originEntity.noteId) {
    return;
}
if (originEntity.type === 'relation' && originEntity.name === 'derivedTopic') {
    return;
}

const origin = api.getNote(originEntity.noteId);

// Projects already have one inherited event handler for metadata sync. Keep
// derived Topics in that same handler so the two systems do not compete for
// Trilium's single runOnAttributeChange/runOnNoteChange relation per root.
const DERIVED_TOPIC_SOURCE_RELATIONS = new Set([
    'project',
    'client',
    'companyOnBehalf',
    'organization',
    'attendee',
    'writer',
]);

const canonicalTopicId = (topicId) => {
    const seen = new Set();
    let current = api.getNote(topicId);
    while (current && !seen.has(current.noteId)) {
        seen.add(current.noteId);
        const alias = current.getOwnedRelations('aliasOf')[0];
        if (!alias || !alias.value) return current.noteId;
        current = api.getNote(alias.value);
    }
    return current ? current.noteId : topicId;
};

const derivedTopicSources = (note) => {
    const sources = [];
    for (const relationName of DERIVED_TOPIC_SOURCE_RELATIONS) {
        for (const relation of note.getRelations(relationName)) {
            try {
                const source = api.getNote(relation.value);
                if (source && !source.isInHiddenSubtree()) sources.push(source);
            } catch (error) {
                api.log(`Topic association skipped missing ${relationName}: ${relation.value}`);
            }
        }
    }
    return sources;
};

const recomputeDerivedTopics = (note) => {
    if (!note || note.isInHiddenSubtree() || note.hasLabel('extTemplate', 'topic')) return;
    const desired = new Set();
    for (const source of derivedTopicSources(note)) {
        source.getRelations('topic').forEach((relation) => {
            if (relation.value) desired.add(canonicalTopicId(relation.value));
        });
    }
    const desiredIds = [...desired].sort();
    const currentIds = note.getOwnedRelations('derivedTopic')
        .map((relation) => relation.value)
        .filter(Boolean)
        .sort();
    if (desiredIds.length === currentIds.length
        && desiredIds.every((value, index) => value === currentIds[index])) return;
    note.getOwnedRelations('derivedTopic').forEach((relation) => {
        note.removeRelation('derivedTopic', relation.value);
    });
    desiredIds.forEach((topicId) => note.addRelation('derivedTopic', topicId));
};

const derivedCandidates = new Map([[origin.noteId, origin]]);
if (origin.hasLabel('extTemplate', 'projectHub')
    || origin.hasLabel('extTemplate', 'person')
    || origin.hasLabel('extTemplate', 'organization')) {
    origin.getTargetRelations()
        .filter((relation) => DERIVED_TOPIC_SOURCE_RELATIONS.has(relation.name))
        .forEach((relation) => {
            try {
                const target = api.getNote(relation.noteId);
                derivedCandidates.set(target.noteId, target);
            } catch (error) {
                api.log(`Topic association skipped missing dependent note: ${relation.noteId}`);
            }
        });
}

if (origin.hasOwnedLabel('extTopic')) {
    origin.getTargetRelations().forEach((relation) => {
        try {
            const dependent = api.getNote(relation.noteId);
            if (relation.name === 'derivedTopic') {
                derivedCandidates.set(dependent.noteId, dependent);
            } else if (relation.name === 'topic') {
                dependent.getTargetRelations()
                    .filter((target) => DERIVED_TOPIC_SOURCE_RELATIONS.has(target.name))
                    .forEach((target) => {
                        const note = api.getNote(target.noteId);
                        derivedCandidates.set(note.noteId, note);
                    });
            }
        } catch (error) {
            api.log(`Topic association skipped missing dependent note: ${relation.noteId}`);
        }
    });
}
const updateDerivedTopics = () => derivedCandidates.forEach(recomputeDerivedTopics);
if (typeof api.transactional === 'function') api.transactional(updateDerivedTopics);
else updateDerivedTopics();

const isTemplate = (note, marker) => note && note.hasLabel('extTemplate', marker);

const relationValue = (note, name) => {
    const relation = note.getRelations(name)[0];
    return relation ? relation.value : null;
};

const setRelationIfNeeded = (note, name, value) => {
    if (!note || !value || relationValue(note, name) === value) {
        return;
    }
    note.setRelation(name, value);
};

const hubFor = (note) => {
    if (isTemplate(note, 'projectHub')) {
        return note;
    }
    return note.getRelations('project')
        .map((relation) => api.getNote(relation.value))
        .find((candidate) => isTemplate(candidate, 'projectHub')) || null;
};

const latestRoundFor = (hub) => hub.getTargetRelations()
    .filter((relation) => relation.type === 'relation' && relation.name === 'project')
    .map((relation) => api.getNote(relation.noteId))
    .filter((note) => isTemplate(note, 'storyDraft'))
    .sort((left, right) => Number(right.getLabelValue('round') || 0)
        - Number(left.getLabelValue('round') || 0))[0] || null;

const reportingFor = (hub) => hub.getTargetRelations()
    .filter((relation) => relation.type === 'relation' && relation.name === 'project')
    .map((relation) => api.getNote(relation.noteId))
    .find((note) => isTemplate(note, 'reportingNotes')) || null;

const reconcileReportingTitle = (hub, reporting) => {
    if (!hub || !reporting) return;
    const expected = `${hub.title} — Reporting Notes`;
    if (reporting.hasLabel('extReportingTitleManaged')
        && reporting.title !== expected) {
        reporting.title = expected;
    }
};

const hub = hubFor(origin);
if (!hub) {
    return;
}

const isRound = isTemplate(origin, 'storyDraft');
const isReporting = isTemplate(origin, 'reportingNotes');
const isHub = isTemplate(origin, 'projectHub');
if (!isRound && !isReporting && !isHub) {
    return;
}

const reporting = isReporting ? origin : reportingFor(hub);

// Note-change events keep generated companion titles useful after a Hub is
// renamed. If a user renames the companion itself, remove the managed marker
// and leave that deliberate title alone.
if (!originEntity.attributeId) {
    const expected = `${hub.title} — Reporting Notes`;
    if (isReporting && origin.hasLabel('extReportingTitleManaged')
        && origin.title !== expected) {
        origin.removeLabel('extReportingTitleManaged');
        return;
    }
    if (isHub) {
        reconcileReportingTitle(hub, reporting);
    }
    return;
}

const originAttribute = originEntity;
if (originAttribute.isDeleted
    || !['client', 'companyOnBehalf'].includes(originAttribute.name)) {
    return;
}

const sync = () => {
    const round = isRound ? origin : latestRoundFor(hub);
    const targets = [hub, round, reporting].filter(Boolean);

    for (const relationName of [originAttribute.name]) {
        // Only a populated value on the changed attribute is authoritative. A
        // content/title/status edit on a note with no client must not clear a
        // relation entered elsewhere. Deletions are left for dashboard
        // reconciliation so an unrelated attribute event cannot erase data.
        const value = originAttribute.value || relationValue(origin, relationName);
        if (!value) continue;
        try {
            api.getNote(value);
        } catch (error) {
            api.log(`Project metadata sync skipped missing ${relationName} target: ${value}`);
            continue;
        }
        targets.forEach((target) => setRelationIfNeeded(target, relationName, value));
    }
};

if (typeof api.transactional === 'function') {
    api.transactional(sync);
} else {
    sync();
}
