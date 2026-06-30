(function () {
    const metrics = window.ABToolMetrics;
    const parser = window.ABToolParser;
    const render = window.ABToolRender;

    const state = {
        rawRows: [],
        rows: [],
        columns: [],
        groups: [],
        availableDataGroups: [],
        latestResult: null,
        analyzeTimer: null
    };

    const els = {};

    function createEmptyGroup() {
        return {
            id: `group-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            dataGroup: '',
            testClasses: [],
            controlClasses: [],
            searchText: ''
        };
    }

    function cacheElements() {
        els.fileInput = document.getElementById('file-input');
        els.targetYingqi = document.getElementById('target-yingqi');
        els.historyYingqi = document.getElementById('history-yingqi');
        els.groupConfigs = document.getElementById('group-configs');
        els.groupTemplate = document.getElementById('group-card-template');
        els.addGroupBtn = document.getElementById('add-group-btn');
        els.analyzeBtn = document.getElementById('analyze-btn');
        els.resetBtn = document.getElementById('reset-btn');
        els.globalAlerts = document.getElementById('global-alerts');
        els.emptyState = document.getElementById('empty-state');
        els.resultShell = document.getElementById('result-shell');
        els.resultTitle = document.getElementById('result-title');
        els.resultDesc = document.getElementById('result-desc');
        els.resultBadges = document.getElementById('result-badges');
        els.statRows = document.getElementById('stat-rows');
        els.statYingqi = document.getElementById('stat-yingqi');
        els.statGroups = document.getElementById('stat-groups');
        els.statUnassigned = document.getElementById('stat-unassigned');
    }

    function resetState() {
        state.rawRows = [];
        state.rows = [];
        state.columns = [];
        state.latestResult = null;
        state.availableDataGroups = [];
        state.groups = [createEmptyGroup()];
        clearTimeout(state.analyzeTimer);
        state.analyzeTimer = null;

        els.fileInput.value = '';
        els.targetYingqi.innerHTML = '<option value="">请先导入数据</option>';
        els.targetYingqi.disabled = true;
        els.historyYingqi.innerHTML = '';
        els.historyYingqi.disabled = true;
        els.statRows.textContent = '0';
        els.statYingqi.textContent = '0';
        els.statGroups.textContent = '0';
        els.statUnassigned.textContent = '-';

        render.renderAlerts(els.globalAlerts, [], []);
        renderGroupConfigs();
        showEmptyState();
    }

    function showEmptyState() {
        els.resultShell.classList.add('d-none');
        els.emptyState.classList.remove('d-none');
    }

    function showResults() {
        els.resultShell.classList.remove('d-none');
        els.emptyState.classList.add('d-none');
    }

    function renderGroupConfigs() {
        els.groupConfigs.innerHTML = '';
        state.groups.forEach((group) => {
            const fragment = els.groupTemplate.content.cloneNode(true);
            const col = fragment.querySelector('.group-card-col');
            col.dataset.groupId = group.id;

            const groupNameSelect = fragment.querySelector('.group-name-select');
            const searchInput = fragment.querySelector('.group-search-input');
            const availableList = fragment.querySelector('.assignment-list-available');
            const testList = fragment.querySelector('.assignment-list-test');
            const controlList = fragment.querySelector('.assignment-list-control');
            const metaText = fragment.querySelector('.group-meta-text');
            const availableCount = fragment.querySelector('.group-count-available');
            const testCount = fragment.querySelector('.group-count-test');
            const controlCount = fragment.querySelector('.group-count-control');
            const removeButton = fragment.querySelector('.remove-group-btn');
            const bulkTestButton = fragment.querySelector('.bulk-test-btn');
            const bulkControlButton = fragment.querySelector('.bulk-control-btn');
            const bulkResetButton = fragment.querySelector('.bulk-reset-btn');
            const moveButtons = fragment.querySelectorAll('.move-btn');
            const selectVisibleButtons = fragment.querySelectorAll('.select-visible-btn');
            const availableOptions = state.availableDataGroups;
            const normalizedGroup = normalizeGroupAssignments(group);
            const validGroupValue = availableOptions.includes(normalizedGroup.dataGroup) ? normalizedGroup.dataGroup : '';
            const classOptions = getClassesForDataGroup(validGroupValue);
            const classSet = new Set(classOptions);
            const testClasses = normalizedGroup.testClasses.filter((item) => classSet.has(item));
            const testSet = new Set(testClasses);
            const controlClasses = normalizedGroup.controlClasses.filter((item) => classSet.has(item) && !testSet.has(item));
            const controlSet = new Set(controlClasses);
            const availableClasses = classOptions.filter((item) => !testSet.has(item) && !controlSet.has(item));
            const searchText = String(normalizedGroup.searchText || '').trim().toLowerCase();

            groupNameSelect.innerHTML = [
                '<option value="">请选择大组</option>',
                ...availableOptions.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
            ].join('');
            groupNameSelect.value = validGroupValue;
            searchInput.value = normalizedGroup.searchText || '';

            availableCount.textContent = `待分配 ${availableClasses.length}`;
            testCount.textContent = `测试组 ${testClasses.length}`;
            controlCount.textContent = `对照组 ${controlClasses.length}`;

            availableList.innerHTML = buildBucketHtml(group.id, 'available', filterClasses(availableClasses, searchText), '暂无待分配班级');
            testList.innerHTML = buildBucketHtml(group.id, 'test', filterClasses(testClasses, searchText), '暂无测试组班级');
            controlList.innerHTML = buildBucketHtml(group.id, 'control', filterClasses(controlClasses, searchText), '暂无对照组班级');

            metaText.textContent = validGroupValue
                ? `当前大组共有 ${classOptions.length} 个班级；支持先搜索，再勾选多个班级批量转移。`
                : '请先选择一个大组。';

            groupNameSelect.addEventListener('change', (event) => {
                updateGroupField(group.id, 'dataGroup', event.target.value);
            });
            searchInput.addEventListener('input', (event) => {
                updateGroupUiField(group.id, 'searchText', event.target.value);
            });
            removeButton.addEventListener('click', () => {
                removeGroup(group.id);
            });
            bulkTestButton.addEventListener('click', () => {
                applyBulkAssignment(group.id, 'test');
            });
            bulkControlButton.addEventListener('click', () => {
                applyBulkAssignment(group.id, 'control');
            });
            bulkResetButton.addEventListener('click', () => {
                applyBulkAssignment(group.id, 'available');
            });
            moveButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    moveSelectedClasses(group.id, button.dataset.source, button.dataset.target);
                });
            });
            selectVisibleButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    toggleVisibleSelection(group.id, button.dataset.bucket, true);
                });
            });

            els.groupConfigs.appendChild(fragment);
        });
        updateGroupStat();
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeGroupAssignments(group) {
        const dataGroup = state.availableDataGroups.includes(group.dataGroup) ? group.dataGroup : '';
        const allowed = new Set(getClassesForDataGroup(dataGroup));
        const testSet = new Set((group.testClasses || []).filter((item) => allowed.has(item)));
        const controlSet = new Set(
            (group.controlClasses || []).filter((item) => allowed.has(item) && !testSet.has(item))
        );
        const ordered = getClassesForDataGroup(dataGroup);
        return {
            id: group.id,
            dataGroup,
            testClasses: ordered.filter((item) => testSet.has(item)),
            controlClasses: ordered.filter((item) => controlSet.has(item)),
            searchText: group.searchText || ''
        };
    }

    function buildBucketHtml(groupId, bucket, classes, emptyText) {
        if (!classes.length) {
            return `<div class="assignment-empty">${escapeHtml(emptyText)}</div>`;
        }
        return classes.map((className, index) => {
            const id = `${groupId}-${bucket}-${index}`;
            return `
                <label class="class-check-item" for="${escapeHtml(id)}">
                    <input class="form-check-input assignment-checkbox" type="checkbox" id="${escapeHtml(id)}" data-bucket="${escapeHtml(bucket)}" value="${escapeHtml(className)}">
                    <span class="class-check-label">${escapeHtml(className)}</span>
                </label>
            `;
        }).join('');
    }

    function filterClasses(classes, keyword) {
        if (!keyword) {
            return classes;
        }
        return classes.filter((item) => item.toLowerCase().includes(keyword));
    }

    function getClassesForDataGroup(groupName) {
        if (!groupName) {
            return [];
        }
        const targetYingqi = Number(els.targetYingqi.value);
        return Array.from(new Set(
            state.rows
                .filter((row) => row['营期'] === targetYingqi && row['大组'] === groupName)
                .map((row) => row['班级'])
                .filter(Boolean)
        )).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }

    function updateGroupUiField(groupId, field, value) {
        state.groups = state.groups.map((group) => (
            group.id === groupId ? Object.assign({}, group, { [field]: value }) : group
        ));
        renderGroupConfigs();
    }

    function updateGroupField(groupId, field, value) {
        state.groups = state.groups.map((group) => {
            if (group.id !== groupId) {
                return group;
            }
            if (field === 'dataGroup') {
                return {
                    id: group.id,
                    dataGroup: value,
                    testClasses: [],
                    controlClasses: [],
                    searchText: ''
                };
            }
            return Object.assign({}, group, { [field]: value });
        });
        renderGroupConfigs();
        updateGroupStat();
        scheduleAnalyze();
    }

    function getGroupCardElement(groupId) {
        return els.groupConfigs.querySelector(`[data-group-id="${groupId}"]`);
    }

    function getCheckedClasses(groupId, bucket) {
        const card = getGroupCardElement(groupId);
        if (!card) {
            return [];
        }
        return Array.from(card.querySelectorAll(`.assignment-checkbox[data-bucket="${bucket}"]:checked`)).map((item) => item.value);
    }

    function toggleVisibleSelection(groupId, bucket, checked) {
        const card = getGroupCardElement(groupId);
        if (!card) {
            return;
        }
        card.querySelectorAll(`.assignment-checkbox[data-bucket="${bucket}"]`).forEach((item) => {
            item.checked = checked;
        });
    }

    function reorderByAvailable(group, classSet) {
        const ordered = getClassesForDataGroup(group.dataGroup);
        return ordered.filter((item) => classSet.has(item));
    }

    function applyBulkAssignment(groupId, targetBucket) {
        state.groups = state.groups.map((group) => {
            if (group.id !== groupId) {
                return group;
            }
            const ordered = getClassesForDataGroup(group.dataGroup);
            if (targetBucket === 'test') {
                return Object.assign({}, group, { testClasses: ordered.slice(), controlClasses: [] });
            }
            if (targetBucket === 'control') {
                return Object.assign({}, group, { testClasses: [], controlClasses: ordered.slice() });
            }
            return Object.assign({}, group, { testClasses: [], controlClasses: [] });
        });
        renderGroupConfigs();
        updateGroupStat();
        scheduleAnalyze();
    }

    function moveSelectedClasses(groupId, sourceBucket, targetBucket) {
        const selected = getCheckedClasses(groupId, sourceBucket);
        if (!selected.length) {
            return;
        }
        state.groups = state.groups.map((group) => {
            if (group.id !== groupId) {
                return group;
            }
            const testSet = new Set(group.testClasses || []);
            const controlSet = new Set(group.controlClasses || []);

            selected.forEach((className) => {
                testSet.delete(className);
                controlSet.delete(className);
                if (targetBucket === 'test') {
                    testSet.add(className);
                } else if (targetBucket === 'control') {
                    controlSet.add(className);
                }
            });

            return Object.assign({}, group, {
                testClasses: reorderByAvailable(group, testSet),
                controlClasses: reorderByAvailable(group, controlSet)
            });
        });
        renderGroupConfigs();
        updateGroupStat();
        scheduleAnalyze();
    }

    function addGroup() {
        state.groups.push(createEmptyGroup());
        renderGroupConfigs();
    }

    function removeGroup(groupId) {
        state.groups = state.groups.filter((group) => group.id !== groupId);
        if (!state.groups.length) {
            state.groups = [createEmptyGroup()];
        }
        renderGroupConfigs();
        scheduleAnalyze();
    }

    function updateGroupStat() {
        const validGroups = state.groups.filter((group) => String(group.dataGroup || '').trim());
        els.statGroups.textContent = `${validGroups.length}`;
    }

    function fillSelectOptions(values) {
        const sorted = values.slice().sort((a, b) => a - b);
        els.targetYingqi.innerHTML = sorted.map((value) => `<option value="${value}">${value}期</option>`).join('');
        els.historyYingqi.innerHTML = sorted.map((value) => `<option value="${value}">${value}期</option>`).join('');
        els.targetYingqi.disabled = false;
        els.historyYingqi.disabled = false;

        if (sorted.length) {
            const latest = sorted[sorted.length - 1];
            els.targetYingqi.value = String(latest);
            Array.from(els.historyYingqi.options).forEach((option) => {
                const numeric = Number(option.value);
                option.selected = numeric !== latest && numeric >= latest - 3;
            });
        }
    }

    function getAvailableDataGroups(targetYingqi) {
        return Array.from(new Set(
            state.rows
                .filter((row) => row['营期'] === targetYingqi)
                .map((row) => String(row['大组'] || '').trim())
                .filter(Boolean)
        )).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }

    function syncGroupsForTarget(autoCreate) {
        const targetYingqi = Number(els.targetYingqi.value);
        state.availableDataGroups = targetYingqi ? getAvailableDataGroups(targetYingqi) : [];
        if (autoCreate && state.availableDataGroups.length) {
            state.groups = state.availableDataGroups.map((groupName) => ({
                id: createEmptyGroup().id,
                dataGroup: groupName,
                testClasses: [],
                controlClasses: [],
                searchText: ''
            }));
        } else {
            state.groups = state.groups.map((group) => {
                const dataGroup = state.availableDataGroups.includes(group.dataGroup) ? group.dataGroup : '';
                const allowed = new Set(getClassesForDataGroup(dataGroup));
                return {
                    id: group.id,
                    dataGroup,
                    testClasses: (group.testClasses || []).filter((item) => allowed.has(item)),
                    controlClasses: (group.controlClasses || []).filter((item) => allowed.has(item)),
                    searchText: group.searchText || ''
                };
            });
            if (!state.groups.length) {
                state.groups = [createEmptyGroup()];
            }
        }
        renderGroupConfigs();
    }

    async function handleFileChange(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) {
            return;
        }

        try {
            render.renderAlerts(els.globalAlerts, [], ['正在解析文件，请稍候...']);
            const parsed = await parser.parseFile(file);
            state.rawRows = parsed.rows;
            state.columns = parsed.columns;
            const prepared = metrics.prepareRows(parsed.rows, parsed.columns);
            state.rows = prepared.rows;

            const warnings = [];
            const errors = [];
            if (prepared.missingKeyColumns.length) {
                errors.push(`缺少关键列：${prepared.missingKeyColumns.join('、')}`);
            }
            if (!state.rows.length) {
                errors.push('文件中未解析到任何数据行。');
            }
            if (!errors.length && prepared.missingOptionalColumns.length) {
                warnings.push(`发现 ${prepared.missingOptionalColumns.length} 个非关键列缺失，系统会按 0 处理。`);
            }

            const availableYingqi = Array.from(new Set(state.rows.map((row) => row['营期']).filter((item) => item > 0)));
            fillSelectOptions(availableYingqi);
            syncGroupsForTarget(true);
            els.statRows.textContent = `${state.rows.length}`;
            els.statYingqi.textContent = `${availableYingqi.length}`;
            render.renderAlerts(els.globalAlerts, errors, warnings);

            if (!errors.length) {
                analyze();
            } else {
                showEmptyState();
            }
        } catch (error) {
            render.renderAlerts(els.globalAlerts, [`文件解析失败：${error.message}`], []);
            showEmptyState();
        }
    }

    function getSelectedHistoryYingqi() {
        return Array.from(els.historyYingqi.selectedOptions).map((option) => Number(option.value));
    }

    function getConfig() {
        return {
            targetYingqi: Number(els.targetYingqi.value),
            historyYingqi: getSelectedHistoryYingqi(),
            groups: state.groups.map((group) => ({
                name: group.dataGroup,
                testText: (group.testClasses || []).join('\n'),
                controlText: (group.controlClasses || []).join('\n')
            }))
        };
    }

    function analyze() {
        const result = metrics.computeDashboard(state.rows, getConfig());
        state.latestResult = result;
        render.renderAlerts(els.globalAlerts, result.errors || [], result.warnings || []);

        if (result.errors && result.errors.length) {
            els.statUnassigned.textContent = '-';
            showEmptyState();
            return;
        }

        showResults();
        els.statUnassigned.textContent = `${result.metadata.unassignedTargetClassCount}`;
        render.renderMeta({
            title: els.resultTitle,
            desc: els.resultDesc,
            badges: els.resultBadges
        }, result);
        render.renderOverall(result);
        render.renderGroup(result);
        render.renderHistory(result);
        setTimeout(render.resizeCharts, 50);
    }

    function scheduleAnalyze() {
        if (!state.rows.length) {
            return;
        }
        clearTimeout(state.analyzeTimer);
        state.analyzeTimer = setTimeout(analyze, 220);
    }

    function bindEvents() {
        els.fileInput.addEventListener('change', handleFileChange);
        els.addGroupBtn.addEventListener('click', addGroup);
        els.analyzeBtn.addEventListener('click', analyze);
        els.resetBtn.addEventListener('click', resetState);
        els.targetYingqi.addEventListener('change', () => {
            syncGroupsForTarget(false);
            scheduleAnalyze();
        });
        els.historyYingqi.addEventListener('change', scheduleAnalyze);

        document.querySelectorAll('[data-bs-toggle="pill"]').forEach((tab) => {
            tab.addEventListener('shown.bs.tab', () => {
                setTimeout(render.resizeCharts, 60);
            });
        });

        document.addEventListener('shown.bs.collapse', () => {
            setTimeout(render.resizeCharts, 80);
        });
    }

    function bootstrap() {
        cacheElements();
        bindEvents();
        resetState();
    }

    document.addEventListener('DOMContentLoaded', bootstrap);
})();
