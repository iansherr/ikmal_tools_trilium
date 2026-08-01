/* A lightweight inventory for the Topics collection.
 *
 * Counts are deliberately calculated from native relation searches instead of
 * copied into labels. The index is a view: topic notes and their backlinks
 * remain the source of truth.
 */

(async () => {
    const note = api.currentNote;
    if (!note || !note.hasLabel('topicRoot')) return;

    const jqueryContainer = api.$container;
    const container = jqueryContainer && (jqueryContainer[0] || jqueryContainer);
    if (!container || typeof container.querySelector !== 'function') return;

    await renderTopicIndex(container);
})();

async function renderTopicIndex(container) {
    const existing = container.querySelector('.extension-topic-index');
    if (existing) existing.remove();

    const panel = document.createElement('section');
    panel.className = 'extension-topic-index alert alert-secondary';
    panel.style.marginBottom = '0.75rem';
    const headingRow = document.createElement('div');
    headingRow.style.alignItems = 'center';
    headingRow.style.display = 'flex';
    headingRow.style.gap = '0.75rem';
    const heading = document.createElement('h2');
    heading.textContent = 'Topic index';
    heading.style.flex = '1';
    heading.style.fontSize = '1.15rem';
    heading.style.margin = '0';
    const refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.className = 'btn btn-sm btn-outline-secondary';
    refresh.textContent = 'Refresh';
    refresh.addEventListener('click', async () => {
        refresh.disabled = true;
        await renderTopicIndex(container);
    });
    headingRow.append(heading, refresh);
    panel.appendChild(headingRow);

    const data = await api.runOnBackend(() => {
        const root = api.getNoteWithLabel('topicRoot');
        if (!root) return { topics: [] };
        const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
        const candidates = root.getChildNotes()
            .filter((candidate) => candidate.hasOwnedLabel('extTopic'));
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
        const topics = candidates
            .filter((candidate) => canonicalTopicId(candidate.noteId) === candidate.noteId)
            .map((topic) => {
                const aliases = candidates.filter((candidate) => candidate.noteId !== topic.noteId
                    && canonicalTopicId(candidate.noteId) === topic.noteId);
                const titles = [topic, ...aliases].map((candidate) => candidate.title);
                const explicitIds = new Set();
                const derivedIds = new Set();
                titles.forEach((title) => {
                    const value = quote(title);
                    (api.searchForNotes(`~topic.title = ${value}`, {}) || [])
                        .forEach((item) => explicitIds.add(item.noteId));
                    (api.searchForNotes(`~derivedTopic.title = ${value}`, {}) || [])
                        .forEach((item) => derivedIds.add(item.noteId));
                });
                return {
                    noteId: topic.noteId,
                    title: topic.title,
                    aliases: aliases.map((alias) => alias.title)
                        .sort((left, right) => left.localeCompare(right)),
                    explicitCount: explicitIds.size,
                    derivedCount: [...derivedIds].filter((id) => !explicitIds.has(id)).length,
                    totalCount: new Set([...explicitIds, ...derivedIds]).size,
                };
            })
            .sort((left, right) => left.title.localeCompare(right.title));
        return {
            topics,
            usedCount: topics.filter((topic) => topic.totalCount > 0).length,
            unusedCount: topics.filter((topic) => topic.totalCount === 0).length,
        };
    });

    const summary = document.createElement('p');
    summary.className = 'text-muted';
    summary.textContent = data.topics.length
        ? `${data.topics.length} topic${data.topics.length === 1 ? '' : 's'} · `
            + `${data.usedCount} in use · ${data.unusedCount} unused`
        : 'No topics yet. Create one from any note’s Topics control.';
    panel.appendChild(summary);

    if (data.topics.length) {
        const table = document.createElement('table');
        table.className = 'table table-sm mb-0';
        const header = document.createElement('tr');
        ['Topic', 'Explicit', 'Related', 'Total notes', 'Actions'].forEach((label) => {
            const cell = document.createElement('th');
            cell.scope = 'col';
            cell.textContent = label;
            header.appendChild(cell);
        });
        const thead = document.createElement('thead');
        thead.appendChild(header);
        table.appendChild(thead);
        const body = document.createElement('tbody');
        data.topics.forEach((topic) => {
            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            const open = document.createElement('button');
            open.type = 'button';
            open.className = 'btn btn-link p-0';
            open.textContent = `#${topic.title}`;
            open.addEventListener('click', () => api.activateNote(topic.noteId));
            nameCell.appendChild(open);
            if (topic.aliases.length) {
                const aliases = document.createElement('div');
                aliases.className = 'text-muted small';
                aliases.textContent = `aka #${topic.aliases.join(', #')}`;
                nameCell.appendChild(aliases);
            }
            row.appendChild(nameCell);
            [topic.explicitCount, topic.derivedCount, topic.totalCount].forEach((count) => {
                const cell = document.createElement('td');
                cell.textContent = String(count);
                row.appendChild(cell);
            });
            const actions = document.createElement('td');
            actions.style.whiteSpace = 'nowrap';
            const rename = document.createElement('button');
            rename.type = 'button';
            rename.className = 'btn btn-sm btn-outline-secondary me-1';
            rename.textContent = 'Rename';
            rename.addEventListener('click', async () => {
                const title = await api.showPromptDialog({
                    title: 'Rename topic',
                    message: 'New topic name',
                    defaultValue: topic.title,
                });
                if (!title || !title.trim() || title.trim() === topic.title) return;
                rename.disabled = true;
                try {
                    await api.runOnBackend((topicId, nextTitle) => {
                        const current = api.getNote(topicId);
                        if (!current || !current.hasOwnedLabel('extTopic')) {
                            throw new Error('Topic no longer exists.');
                        }
                        const root = api.getNoteWithLabel('topicRoot');
                        const duplicate = root.getChildNotes().find((candidate) =>
                            candidate.noteId !== topicId
                            && candidate.hasOwnedLabel('extTopic')
                            && candidate.title.toLocaleLowerCase() === nextTitle.toLocaleLowerCase());
                        if (duplicate) throw new Error(`A topic named ${duplicate.title} already exists.`);
                        current.title = nextTitle;
                    }, [topic.noteId, title.trim()]);
                    await api.waitUntilSynced();
                    await renderTopicIndex(container);
                } catch (error) {
                    rename.disabled = false;
                    api.showError(`Could not rename topic: ${error.message}`);
                }
            });
            const merge = document.createElement('button');
            merge.type = 'button';
            merge.className = 'btn btn-sm btn-outline-secondary';
            merge.textContent = 'Merge';
            merge.title = 'Move this topic’s explicit relations into another topic';
            merge.addEventListener('click', async () => {
                const targetTitle = await api.showPromptDialog({
                    title: `Merge #${topic.title}`,
                    message: 'Merge into which existing topic?',
                });
                if (!targetTitle || !targetTitle.trim()) return;
                if (!window.confirm(`Merge #${topic.title} into #${targetTitle.trim()}? The source topic note will be removed.`)) return;
                merge.disabled = true;
                try {
                    const result = await api.runOnBackend((sourceId, requestedTitle) => {
                        const root = api.getNoteWithLabel('topicRoot');
                        const source = api.getNote(sourceId);
                        const target = root.getChildNotes().find((candidate) =>
                            candidate.hasOwnedLabel('extTopic')
                            && candidate.noteId !== sourceId
                            && candidate.title.toLocaleLowerCase() === requestedTitle.toLocaleLowerCase());
                        if (!target) throw new Error(`Could not find topic ${requestedTitle}.`);
                        const sourceTitle = source.title;
                        const related = api.searchForNotes(
                            `~topic.title = '${sourceTitle.replace(/'/g, "''")}'`,
                            {},
                        ) || [];
                        let changed = 0;
                        const update = () => {
                            related.forEach((note) => {
                                const current = api.getNote(note.noteId);
                                const relations = current.getOwnedRelations('topic');
                                if (!relations.some((relation) => relation.value === sourceId)) return;
                                relations.filter((relation) => relation.value === sourceId)
                                    .forEach((relation) => current.removeRelation('topic', relation.value));
                                if (!current.getOwnedRelations('topic')
                                    .some((relation) => relation.value === target.noteId)) {
                                    current.addRelation('topic', target.noteId);
                                }
                                changed += 1;
                            });
                            source.deleteNote();
                        };
                        if (typeof api.transactional === 'function') api.transactional(update);
                        else update();
                        return { targetTitle: target.title, changed };
                    }, [topic.noteId, targetTitle.trim()]);
                    await api.waitUntilSynced();
                    await renderTopicIndex(container);
                } catch (error) {
                    merge.disabled = false;
                    api.showError(`Could not merge topic: ${error.message}`);
                }
            });
            actions.append(rename, merge);
            const alias = document.createElement('button');
            alias.type = 'button';
            alias.className = 'btn btn-sm btn-outline-secondary ms-1';
            alias.textContent = 'Alias';
            alias.title = 'Make this Topic an alias of another canonical Topic';
            alias.addEventListener('click', async () => {
                const targetTitle = await api.showPromptDialog({
                    title: `Alias #${topic.title}`,
                    message: 'Use this name as an alias for which existing topic?',
                });
                if (!targetTitle || !targetTitle.trim()) return;
                if (!window.confirm(`Use #${topic.title} as an alias for #${targetTitle.trim()}?`)) return;
                alias.disabled = true;
                try {
                    await api.runOnBackend((sourceId, requestedTitle) => {
                        const root = api.getNoteWithLabel('topicRoot');
                        const source = api.getNote(sourceId);
                        const findCanonical = (candidate) => {
                            const seen = new Set();
                            let current = candidate;
                            while (current && !seen.has(current.noteId)) {
                                seen.add(current.noteId);
                                const relation = current.getOwnedRelations('aliasOf')[0];
                                if (!relation || !relation.value) return current;
                                current = api.getNote(relation.value);
                            }
                            return current;
                        };
                        const requested = root.getChildNotes().find((candidate) =>
                            candidate.hasOwnedLabel('extTopic')
                            && candidate.noteId !== sourceId
                            && candidate.title.toLocaleLowerCase() === requestedTitle.toLocaleLowerCase());
                        const target = requested && findCanonical(requested);
                        if (!target || target.noteId === sourceId) {
                            throw new Error(`Could not find another topic named ${requestedTitle}.`);
                        }
                        const sourceAliases = root.getChildNotes().filter((candidate) =>
                            candidate.getOwnedRelations('aliasOf')
                                .some((relation) => relation.value === sourceId));
                        if (sourceAliases.length) {
                            throw new Error('Move this Topic’s existing aliases first.');
                        }
                        const related = api.searchForNotes(
                            `~topic.title = '${source.title.replace(/'/g, "''")}'`,
                            {},
                        ) || [];
                        const update = () => {
                            related.forEach((note) => {
                                const current = api.getNote(note.noteId);
                                const relations = current.getOwnedRelations('topic');
                                if (!relations.some((relation) => relation.value === sourceId)) return;
                                relations.filter((relation) => relation.value === sourceId)
                                    .forEach((relation) => current.removeRelation('topic', relation.value));
                                if (!current.getOwnedRelations('topic')
                                    .some((relation) => relation.value === target.noteId)) {
                                    current.addRelation('topic', target.noteId);
                                }
                            });
                            source.setRelation('aliasOf', target.noteId);
                        };
                        if (typeof api.transactional === 'function') api.transactional(update);
                        else update();
                    }, [topic.noteId, targetTitle.trim()]);
                    await api.waitUntilSynced();
                    await renderTopicIndex(container);
                } catch (error) {
                    alias.disabled = false;
                    api.showError(`Could not set alias: ${error.message}`);
                }
            });
            actions.appendChild(alias);
            row.appendChild(actions);
            body.appendChild(row);
        });
        table.appendChild(body);
        panel.appendChild(table);
    }

    container.prepend(panel);
}
