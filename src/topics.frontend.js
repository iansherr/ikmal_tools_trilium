/* Optional cross-categorization for the current note.
 *
 * Topics are native multi-relations to visible #extTopic notes. The small
 * picker is deliberately opt-in: it offers explicit hashtags as suggestions,
 * but never creates or assigns a topic without a click.
 */

(async () => {
    const note = api.currentNote;
    if (!note || note.isInHiddenSubtree && note.isInHiddenSubtree()) return;
    if (note.type === 'book' || note.type === 'search') return;
    if (note.hasLabel('extView') || note.hasLabel('extDashboardFilters')
        || note.hasLabel('extHubDashboard') || note.hasLabel('extTodayDashboard')) return;

    const jqueryContainer = api.$container;
    const container = jqueryContainer && (jqueryContainer[0] || jqueryContainer);
    if (!container || typeof container.querySelector !== 'function'
        || container.querySelector('.extension-topic-bar')) return;

    const data = await api.runOnBackend((noteId) => {
        const current = api.getNote(noteId);
        const root = api.getNoteWithLabel('topicRoot');
        const candidates = root
            ? root.getChildNotes().filter((candidate) => candidate.hasOwnedLabel('extTopic'))
            : [];
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
            .map((candidate) => ({
                noteId: candidate.noteId,
                title: candidate.title,
                aliases: candidates
                    .filter((alias) => alias.noteId !== candidate.noteId
                        && canonicalTopicId(alias.noteId) === candidate.noteId)
                    .map((alias) => alias.title)
                    .sort((left, right) => left.localeCompare(right)),
            }))
            .sort((left, right) => left.title.localeCompare(right.title));
        const body = String(current.getContent() || '');
        const hashtags = [];
        const seen = new Set();
        const pattern = /(^|[\s([{:;])#([A-Za-z][A-Za-z0-9_-]*)/g;
        let match;
        while ((match = pattern.exec(`${current.title}\n${body}`))) {
            const tag = match[2];
            const key = tag.toLocaleLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                hashtags.push(tag);
            }
        }
        const derivedSources = [];
        for (const relationName of [
            'project', 'client', 'companyOnBehalf', 'organization', 'attendee', 'writer',
        ]) {
            for (const relation of current.getRelations(relationName)) {
                try {
                    const source = api.getNote(relation.value);
                    const topicIds = source.getRelations('topic')
                        .map((topic) => canonicalTopicId(topic.value));
                    if (topicIds.length) derivedSources.push({
                        noteId: source.noteId,
                        title: source.title,
                        topicIds,
                    });
                } catch (error) {
                    // The backend association hook will retry after sync.
                }
            }
        }
        return {
            noteId,
            title: current.title,
            topics,
            selected: [...new Set(current.getRelations('topic')
                .map((relation) => canonicalTopicId(relation.value)))],
            derived: [...new Set(current.getRelations('derivedTopic')
                .map((relation) => canonicalTopicId(relation.value)))],
            derivedSources,
            hashtags,
        };
    }, [note.noteId]);
    if (!data) return;

    const bar = document.createElement('div');
    bar.className = 'extension-topic-bar alert alert-secondary';
    bar.style.alignItems = 'center';
    bar.style.display = 'flex';
    bar.style.flexWrap = 'wrap';
    bar.style.gap = '0.4rem';
    bar.style.marginBottom = '0.75rem';
    bar.style.minWidth = '0';

    const label = document.createElement('strong');
    label.textContent = 'Topics';
    bar.appendChild(label);

    const summary = document.createElement('span');
    summary.style.alignItems = 'center';
    summary.style.display = 'flex';
    summary.style.flex = '1';
    summary.style.flexWrap = 'wrap';
    summary.style.gap = '0.25rem';
    summary.style.minWidth = '0';
    summary.style.overflowWrap = 'anywhere';
    bar.appendChild(summary);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-secondary';
    button.style.flexShrink = '0';
    button.textContent = data.selected.length || data.derived.length ? 'Edit topics' : 'Add topics';
    button.title = 'Open Topics (Ctrl/Cmd+Shift+T)';
    button.addEventListener('click', () => openTopicPicker(data, summary, button));
    bar.appendChild(button);
    if (document.__extensionTopicShortcut) {
        document.removeEventListener('keydown', document.__extensionTopicShortcut);
    }
    document.__extensionTopicShortcut = (event) => {
        const target = event.target;
        const editing = target && (target.matches('input, textarea, select, [contenteditable="true"]')
            || target.isContentEditable);
        if (!editing && (event.metaKey || event.ctrlKey) && event.shiftKey
            && event.key.toLocaleLowerCase() === 't') {
            event.preventDefault();
            button.click();
        }
    };
    document.addEventListener('keydown', document.__extensionTopicShortcut);
    const refreshInlineSummary = () => renderTopicSummary(
        summary,
        data.topics,
        data.selected,
        data.derived,
        data.derivedSources,
        async (topicId) => {
            try {
                await api.runOnBackend((noteId, canonicalId) => {
                    const current = api.getNote(noteId);
                    const canonicalTopicId = (candidateId) => {
                        const seen = new Set();
                        let candidate = api.getNote(candidateId);
                        while (candidate && !seen.has(candidate.noteId)) {
                            seen.add(candidate.noteId);
                            const alias = candidate.getOwnedRelations('aliasOf')[0];
                            if (!alias || !alias.value) return candidate.noteId;
                            candidate = api.getNote(alias.value);
                        }
                        return candidate ? candidate.noteId : candidateId;
                    };
                    current.getRelations('topic')
                        .filter((relation) => relation.value === canonicalId
                            || canonicalTopicId(relation.value) === canonicalId)
                        .forEach((relation) => current.removeRelation('topic', relation.value));
                }, [data.noteId, topicId]);
                await api.waitUntilSynced();
                data.selected = data.selected.filter((id) => id !== topicId);
                refreshInlineSummary();
                button.textContent = data.selected.length || data.derived.length
                    ? 'Edit topics' : 'Add topics';
            } catch (error) {
                api.showError(`Could not remove topic: ${error.message}`);
            }
        },
        async (topicId) => {
            try {
                await api.runOnBackend((noteId, canonicalId) => {
                    const current = api.getNote(noteId);
                    if (!current.getOwnedRelations('topic')
                        .some((relation) => relation.value === canonicalId)) {
                        current.addRelation('topic', canonicalId);
                    }
                }, [data.noteId, topicId]);
                await api.waitUntilSynced();
                if (!data.selected.includes(topicId)) data.selected.push(topicId);
                refreshInlineSummary();
                button.textContent = 'Edit topics';
            } catch (error) {
                api.showError(`Could not keep topic explicit: ${error.message}`);
            }
        },
    );
    summary.refreshTopicSummary = refreshInlineSummary;
    refreshInlineSummary();
    container.prepend(bar);
})();

function renderTopicSummary(container, topics, selected, derived, derivedSources, onRemove, onKeep) {
    container.replaceChildren();
    const explicit = new Set(selected);
    const makeChip = (topic, isRelated) => {
        const chip = document.createElement('span');
        chip.style.alignItems = 'center';
        chip.style.display = 'inline-flex';
        chip.style.gap = '0.15rem';
        const open = document.createElement('button');
        open.type = 'button';
        open.className = isRelated ? 'btn btn-sm btn-outline-secondary' : 'btn btn-sm btn-outline-primary';
        open.textContent = isRelated ? `#${topic.title} (related)` : `#${topic.title}`;
        open.title = isRelated
            ? `Related through ${derivedSources.filter((source) => source.topicIds.includes(topic.noteId))
                .map((source) => source.title).join(', ') || 'another note'}`
            : `Open ${topic.title}`;
        open.addEventListener('click', () => showTopicPopover(
            chip,
            topic,
            isRelated,
            derivedSources,
            onRemove,
            onKeep,
        ));
        chip.appendChild(open);
        if (!isRelated) {
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'btn btn-sm btn-outline-primary';
            remove.textContent = '×';
            remove.title = `Remove ${topic.title}`;
            remove.addEventListener('click', () => onRemove(topic.noteId));
            chip.appendChild(remove);
        }
        return chip;
    };
    const explicitTopics = selected
        .map((id) => topics.find((topic) => topic.noteId === id))
        .filter(Boolean);
    const relatedTopics = derived
        .filter((id) => !explicit.has(id))
        .map((id) => topics.find((topic) => topic.noteId === id))
        .filter(Boolean);
    [...explicitTopics.map((topic) => makeChip(topic, false)),
        ...relatedTopics.map((topic) => makeChip(topic, true))]
        .forEach((chip) => container.appendChild(chip));
    if (!explicitTopics.length && !relatedTopics.length) {
        const empty = document.createElement('span');
        empty.className = 'text-muted';
        empty.textContent = 'None yet';
        container.appendChild(empty);
    }
}

function dismissTopicPopover() {
    if (document.__extensionTopicPopoverCleanup) {
        document.__extensionTopicPopoverCleanup();
    }
}

function showTopicPopover(anchor, topic, isRelated, derivedSources, onRemove, onKeep) {
    dismissTopicPopover();
    const popover = document.createElement('div');
    popover.className = 'alert alert-secondary';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', `Details for ${topic.title}`);
    popover.style.backgroundColor = 'var(--main-background-color)';
    popover.style.boxShadow = '0 0.35rem 1rem rgba(0, 0, 0, 0.2)';
    popover.style.maxWidth = 'min(22rem, calc(100vw - 1rem))';
    popover.style.padding = '0.75rem';
    popover.style.position = 'fixed';
    popover.style.zIndex = '1060';

    const heading = document.createElement('strong');
    heading.textContent = `#${topic.title}`;
    popover.appendChild(heading);
    const status = document.createElement('p');
    status.className = 'text-muted mb-2';
    status.textContent = isRelated ? 'Related Topic' : 'Explicit Topic';
    popover.appendChild(status);

    if (topic.aliases && topic.aliases.length) {
        const aliases = document.createElement('p');
        aliases.className = 'text-muted mb-2';
        aliases.textContent = `Aliases: #${topic.aliases.join(', #')}`;
        popover.appendChild(aliases);
    }

    if (isRelated) {
        const sources = derivedSources.filter((source) => source.topicIds.includes(topic.noteId));
        const sourceLabel = document.createElement('div');
        sourceLabel.className = 'text-muted mb-1';
        sourceLabel.textContent = sources.length ? 'Related through:' : 'Related through another note';
        popover.appendChild(sourceLabel);
        sources.forEach((source) => {
            const sourceButton = document.createElement('button');
            sourceButton.type = 'button';
            sourceButton.className = 'btn btn-sm btn-link d-block p-0';
            sourceButton.textContent = source.title;
            sourceButton.addEventListener('click', () => {
                dismissTopicPopover();
                api.activateNote(source.noteId);
            });
            popover.appendChild(sourceButton);
        });
    }

    const actions = document.createElement('div');
    actions.className = 'd-flex flex-wrap gap-2 mt-2';
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'btn btn-sm btn-primary';
    open.textContent = 'Open Topic';
    open.addEventListener('click', () => {
        dismissTopicPopover();
        api.activateNote(topic.noteId);
    });
    actions.appendChild(open);
    if (!isRelated) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'btn btn-sm btn-outline-secondary';
        remove.textContent = 'Remove';
        remove.addEventListener('click', async () => {
            dismissTopicPopover();
            await onRemove(topic.noteId);
        });
        actions.appendChild(remove);
    } else {
        const keep = document.createElement('button');
        keep.type = 'button';
        keep.className = 'btn btn-sm btn-outline-secondary';
        keep.textContent = 'Keep explicit';
        keep.title = 'Keep this Topic even if the source relationship changes';
        keep.addEventListener('click', async () => {
            dismissTopicPopover();
            await onKeep(topic.noteId);
        });
        actions.appendChild(keep);
    }
    popover.appendChild(actions);
    document.body.appendChild(popover);

    const position = () => {
        const rect = anchor.getBoundingClientRect();
        const width = popover.offsetWidth;
        const height = popover.offsetHeight;
        const left = Math.max(0.5 * 16, Math.min(rect.left, window.innerWidth - width - 0.5 * 16));
        const top = rect.bottom + 0.5 * 16 + height <= window.innerHeight
            ? rect.bottom + 0.5 * 16
            : Math.max(0.5 * 16, rect.top - height - 0.5 * 16);
        popover.style.left = `${left}px`;
        popover.style.top = `${top}px`;
    };
    position();
    const onDocumentClick = (event) => {
        if (!popover.contains(event.target) && !anchor.contains(event.target)) dismissTopicPopover();
    };
    const onKeyDown = (event) => {
        if (event.key === 'Escape') dismissTopicPopover();
    };
    const cleanup = () => {
        popover.remove();
        document.removeEventListener('click', onDocumentClick);
        document.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('resize', position);
        delete document.__extensionTopicPopoverCleanup;
    };
    document.__extensionTopicPopoverCleanup = cleanup;
    setTimeout(() => document.addEventListener('click', onDocumentClick), 0);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', position);
}

function topicSummary(topics, selected, derived = []) {
    const names = selected
        .map((id) => topics.find((topic) => topic.noteId === id))
        .filter(Boolean)
        .map((topic) => `#${topic.title}`);
    const explicit = new Set(selected);
    const related = derived
        .filter((id) => !explicit.has(id))
        .map((id) => topics.find((topic) => topic.noteId === id))
        .filter(Boolean)
        .map((topic) => `#${topic.title} (related)`);
    const all = [...names, ...related];
    return all.length ? all.join('  ') : 'None yet';
}

function topicMatchesName(topic, value) {
    const normalized = value.toLocaleLowerCase();
    return topic.title.toLocaleLowerCase().includes(normalized)
        || (topic.aliases || []).some((alias) => alias.toLocaleLowerCase().includes(normalized));
}

function topicHasExactName(topic, value) {
    const normalized = value.toLocaleLowerCase();
    return topic.title.toLocaleLowerCase() === normalized
        || (topic.aliases || []).some((alias) => alias.toLocaleLowerCase() === normalized);
}

function topicLabel(topic) {
    return `#${topic.title}${topic.aliases && topic.aliases.length
        ? ` (aka #${topic.aliases.join(', #')})` : ''}`;
}

function topicSourceTitles(data, topicId) {
    return data.derivedSources
        .filter((source) => source.topicIds.includes(topicId))
        .map((source) => source.title);
}

async function openTopicPicker(data, summary, button) {
    const overlay = document.createElement('div');
    overlay.className = 'modal fade show';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.35)';
    overlay.style.display = 'block';
    overlay.style.padding = '0.5rem';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'extension-topic-heading');
    overlay.tabIndex = -1;

    const dialog = document.createElement('div');
    dialog.className = 'modal-dialog modal-dialog-centered';
    dialog.style.maxWidth = 'min(42rem, calc(100vw - 1rem))';
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.padding = '1rem';
    content.style.maxHeight = 'calc(100vh - 2rem)';
    content.style.overflowY = 'auto';
    const heading = document.createElement('h2');
    heading.className = 'modal-title';
    heading.id = 'extension-topic-heading';
    heading.textContent = 'Topics';
    const hint = document.createElement('p');
    hint.className = 'text-muted';
    hint.textContent = 'Choose a few subjects. Use Keep explicit, then Save topics, for a related topic you want to retain.';
    const filter = document.createElement('input');
    filter.type = 'search';
    filter.className = 'form-control';
    filter.placeholder = 'Search topics or aliases…';
    filter.setAttribute('aria-label', 'Filter topics');
    const list = document.createElement('div');
    list.style.maxHeight = 'min(18rem, 38vh)';
    list.style.overflowY = 'auto';
    list.style.margin = '0.7rem 0';
    const actions = document.createElement('div');
    actions.className = 'd-flex flex-wrap gap-2';
    actions.style.alignItems = 'center';
    const selectedTray = document.createElement('div');
    selectedTray.style.display = 'flex';
    selectedTray.style.flexWrap = 'wrap';
    selectedTray.style.gap = '0.35rem';
    selectedTray.style.margin = '0.5rem 0';
    const selected = new Set(data.selected);
    const derived = new Set(data.derived);
    const contextMessages = [];
    let saveButton = null;
    const originalSelected = new Set(data.selected);
    const lastFocused = document.activeElement;
    let dialogKeydown = null;
    const isDirty = () => selected.size !== originalSelected.size
        || [...selected].some((id) => !originalSelected.has(id));
    const updateSaveState = () => {
        if (!saveButton) return;
        saveButton.disabled = !isDirty();
        saveButton.textContent = `Save topics (${selected.size})${isDirty() ? ' *' : ''}`;
    };
    const close = (force = false) => {
        if (!force && isDirty()
            && !window.confirm('Discard unsaved Topic changes?')) return false;
        overlay.remove();
        if (dialogKeydown) document.removeEventListener('keydown', dialogKeydown);
        if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
        return true;
    };

    const renderSelected = () => {
        selectedTray.replaceChildren();
        const label = document.createElement('strong');
        label.textContent = `Selected (${selected.size})`;
        selectedTray.appendChild(label);
        if (!selected.size) {
            const empty = document.createElement('span');
            empty.className = 'text-muted';
            empty.textContent = 'None yet';
            selectedTray.appendChild(empty);
            return;
        }
        [...selected]
            .map((id) => data.topics.find((topic) => topic.noteId === id))
            .filter(Boolean)
            .forEach((topic) => {
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = 'btn btn-sm btn-outline-primary';
                chip.textContent = `${topicLabel(topic)} ×`;
                chip.title = `Remove ${topic.title}`;
                chip.addEventListener('click', () => {
                    selected.delete(topic.noteId);
                    render();
                });
                selectedTray.appendChild(chip);
            });
    };

    const render = () => {
        renderSelected();
        updateSaveState();
        list.replaceChildren();
        const query = filter.value.trim().toLocaleLowerCase();
        const visible = data.topics.filter((topic) => !query || topicMatchesName(topic, query));
        const addHeading = (title) => {
            const heading = document.createElement('h3');
            heading.className = 'text-muted';
            heading.style.fontSize = '0.85rem';
            heading.style.margin = '0.65rem 0 0.25rem';
            heading.textContent = title;
            list.appendChild(heading);
        };
        const addSelectable = (topic, checked) => {
            const row = document.createElement('label');
            row.style.display = 'block';
            row.style.padding = '0.25rem 0';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = checked;
            checkbox.style.marginRight = '0.5rem';
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) selected.add(topic.noteId);
                else selected.delete(topic.noteId);
                render();
            });
            const text = document.createElement('span');
            text.textContent = `${topicLabel(topic)}${derived.has(topic.noteId)
                ? ' (also related)' : ''}`;
            row.append(checkbox, text);
            list.appendChild(row);
        };
        const selectedTopics = visible.filter((topic) => selected.has(topic.noteId));
        const relatedTopics = visible.filter((topic) => derived.has(topic.noteId)
            && !selected.has(topic.noteId));
        const availableTopics = visible.filter((topic) => !derived.has(topic.noteId)
            && !selected.has(topic.noteId));
        if (selectedTopics.length) {
            addHeading('Selected');
            selectedTopics.forEach((topic) => addSelectable(topic, true));
        }
        if (relatedTopics.length) {
            addHeading('Related — not yet explicit');
            relatedTopics.forEach((topic) => {
                const row = document.createElement('div');
                row.style.alignItems = 'center';
                row.style.display = 'flex';
                row.style.gap = '0.5rem';
                row.style.padding = '0.25rem 0';
                const text = document.createElement('span');
                const sources = topicSourceTitles(data, topic.noteId);
                text.textContent = `${topicLabel(topic)} (from ${sources.length
                    ? sources.join(', ')
                    : 'a related note'})`;
                const keep = document.createElement('button');
                keep.type = 'button';
                keep.className = 'btn btn-sm btn-outline-secondary';
                keep.textContent = 'Keep explicit';
                keep.title = 'Keep this topic even if the related note changes';
                keep.addEventListener('click', () => {
                    selected.add(topic.noteId);
                    render();
                });
                row.append(text, keep);
                list.appendChild(row);
            });
        }
        if (availableTopics.length) {
            addHeading('Available');
            availableTopics.forEach((topic) => addSelectable(topic, false));
        }
        if (!visible.length) {
            const empty = document.createElement('p');
            empty.className = 'text-muted';
            empty.textContent = 'No matching topics.';
            list.appendChild(empty);
        }
    };
    list.addEventListener('keydown', (event) => {
        const focusable = [...list.querySelectorAll('input[type="checkbox"]:not(:disabled), button:not(:disabled)')];
        const currentIndex = focusable.indexOf(document.activeElement);
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && currentIndex >= 0) {
            event.preventDefault();
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            const nextIndex = (currentIndex + direction + focusable.length) % focusable.length;
            focusable[nextIndex].focus();
        } else if (event.key === 'Enter' && currentIndex >= 0) {
            event.preventDefault();
            focusable[currentIndex].click();
        }
    });
    filter.addEventListener('input', render);
    render();

    if (data.derivedSources.length) {
        const sources = document.createElement('p');
        sources.className = 'text-muted';
        sources.textContent = `Related notes: ${data.derivedSources.map((source) => source.title).join(', ')}`;
        contextMessages.push(sources);
    }

    const createTopic = async (topicTitle) => {
        const created = await api.runOnBackend((title) => {
            const root = api.getNoteWithLabel('topicRoot');
            const templateRoot = api.getNoteWithLabel('templateRoot');
            const template = templateRoot && templateRoot.getChildNotes()
                .find((candidate) => candidate.getOwnedLabelValue('extTemplate') === 'topic');
            if (!root) throw new Error('Topics root is missing; rerun install.py.');
            const duplicate = root.getChildNotes().find((candidate) =>
                candidate.hasOwnedLabel('extTopic')
                && candidate.title.toLocaleLowerCase() === title.toLocaleLowerCase());
            if (duplicate) throw new Error(`A topic or alias named ${duplicate.title} already exists.`);
            const result = api.createTextNote(root.noteId, title, '');
            if (template) result.note.setRelation('template', template.noteId);
            result.note.setLabel('noteType', 'topic');
            result.note.setLabel('noteGroup', 'topic');
            result.note.setLabel('extTopic');
            return { noteId: result.note.noteId, title: result.note.title };
        }, [topicTitle]);
        created.aliases = [];
        data.topics.push(created);
        data.topics.sort((left, right) => left.title.localeCompare(right.title));
        selected.add(created.noteId);
        render();
    };

    const hashtagSuggestions = data.hashtags.filter((tag) => !data.topics.some(
        (topic) => topicHasExactName(topic, tag),
    ));
    if (hashtagSuggestions.length) {
        const suggestions = document.createElement('div');
        suggestions.className = 'text-muted';
        const label = document.createElement('span');
        label.textContent = 'Hashtag suggestions: ';
        suggestions.appendChild(label);
        hashtagSuggestions.forEach((tag, index) => {
            const create = document.createElement('button');
            create.type = 'button';
            create.className = 'btn btn-sm btn-link p-0';
            create.textContent = `Create & select #${tag}`;
            create.title = 'Create this hashtag as a Topic and select it';
            create.addEventListener('click', async () => {
                create.disabled = true;
                try {
                    await createTopic(tag);
                } catch (error) {
                    create.disabled = false;
                    api.showError(`Could not create topic: ${error.message}`);
                }
            });
            suggestions.appendChild(create);
            if (index < hashtagSuggestions.length - 1) suggestions.append(', ');
        });
        contextMessages.push(suggestions);
    }

    const canonicalMatches = data.hashtags
        .map((tag) => ({
            tag,
            topic: data.topics.find((topic) => topic.title.toLocaleLowerCase()
                === tag.toLocaleLowerCase()),
        }))
        .filter((match) => match.topic);
    if (canonicalMatches.length) {
        const known = document.createElement('div');
        known.className = 'text-muted';
        const label = document.createElement('span');
        label.textContent = 'Recognized hashtags: ';
        known.appendChild(label);
        canonicalMatches.forEach((match, index) => {
            const use = document.createElement('button');
            use.type = 'button';
            use.className = 'btn btn-sm btn-link p-0';
            use.textContent = `Select #${match.topic.title}`;
            use.title = 'Select this existing Topic';
            use.addEventListener('click', () => {
                selected.add(match.topic.noteId);
                render();
            });
            known.appendChild(use);
            if (index < canonicalMatches.length - 1) known.append(', ');
        });
        contextMessages.push(known);
    }

    const aliasMatches = data.hashtags
        .map((tag) => ({
            tag,
            topic: data.topics.find((topic) => (topic.aliases || [])
                .some((alias) => alias.toLocaleLowerCase() === tag.toLocaleLowerCase())),
        }))
        .filter((match) => match.topic);
    if (aliasMatches.length) {
        const aliases = document.createElement('div');
        aliases.className = 'text-muted';
        const aliasLabel = document.createElement('span');
        aliasLabel.textContent = 'Known aliases: ';
        aliases.appendChild(aliasLabel);
        aliasMatches.forEach((match, index) => {
            const use = document.createElement('button');
            use.type = 'button';
            use.className = 'btn btn-sm btn-link p-0';
            use.textContent = `#${match.tag} → #${match.topic.title}`;
            use.title = 'Select the canonical Topic';
            use.addEventListener('click', () => {
                selected.add(match.topic.noteId);
                render();
            });
            aliases.appendChild(use);
            if (index < aliasMatches.length - 1) aliases.append(', ');
        });
        contextMessages.push(aliases);
    }

    const create = document.createElement('button');
    create.type = 'button';
    create.className = 'btn btn-outline-secondary';
    create.textContent = 'New topic';
    create.addEventListener('click', async () => {
        const title = await api.showPromptDialog({
            title: 'New topic',
            message: 'Topic name',
            defaultValue: filter.value.trim().replace(/^#/, ''),
        });
        if (!title || !title.trim()) return;
        try {
            await createTopic(title.trim());
        } catch (error) {
            api.showError(`Could not create topic: ${error.message}`);
        }
    });

    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'btn btn-primary';
    saveButton = save;
    updateSaveState();
    save.addEventListener('click', async () => {
        save.disabled = true;
        try {
            const ids = [...selected];
            await api.runOnBackend((noteId, topicIds) => {
                const current = api.getNote(noteId);
                current.getRelations('topic').forEach((relation) => {
                    current.removeRelation('topic', relation.value);
                });
                topicIds.forEach((topicId) => current.addRelation('topic', topicId));
            }, [data.noteId, ids]);
            await api.waitUntilSynced();
            data.selected = ids;
            originalSelected.clear();
            ids.forEach((id) => originalSelected.add(id));
            if (typeof summary.refreshTopicSummary === 'function') summary.refreshTopicSummary();
            else summary.textContent = topicSummary(data.topics, ids, data.derived);
            button.textContent = ids.length || data.derived.length ? 'Edit topics' : 'Add topics';
            close(true);
        } catch (error) {
            save.disabled = false;
            api.showError(`Could not save topics: ${error.message}`);
        }
    });
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn btn-outline-secondary';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', close);
    actions.append(create, save, cancel);
    content.append(heading, hint, selectedTray, ...contextMessages, filter, list, actions);
    dialog.appendChild(content);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close();
    });
    dialogKeydown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            close();
            return;
        }
        if (event.key !== 'Tab') return;
        const focusable = [...content.querySelectorAll('button, input')]
            .filter((element) => !element.disabled);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };
    document.addEventListener('keydown', dialogKeydown);
    document.body.appendChild(overlay);
    filter.focus();
}
