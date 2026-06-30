(function () {
    const PROCESS_METRICS = [
        'day1晨读', 'day1到播', 'day1留存', 'day1发言',
        'day2晨读', 'day2到播', 'day2留存', 'day2发言',
        'day3晨读', 'day3到播', 'day3留存', 'day3发言',
        'day4晨读', 'day4到播', 'day4留存', 'day4发言',
        'day5晨读', 'day5到播', 'day5留存', 'day5发言',
        'day6到播', 'day6留存', 'day6发言',
        'day7到播', 'day7留存', 'day7发言'
    ];

    const CONVERSION_METRICS = [
        'day3转率', 'day3待支付率', 'day3待支付转率',
        'day3到播转率', 'd3到播待支付率', 'd3到播待支付转率',
        'day4转率', 'day4待支付率', 'day4待支付转率',
        'day4到播转率', 'd4到播待支付率', 'd4到播待支付转率',
        'day5转率', 'day5待支付率', 'day5待支付转率', 'day5到播转率',
        'day6转率', 'day6待支付率', 'day6待支付转率', 'day6到播转率',
        'd6到播待支付率', 'd6到播待支付转率',
        'day7转率', 'day7待支付率', 'day7待支付转率', 'day7到播转率',
        'd7到播待支付率', 'd7到播待支付转率'
    ];

    const SUMMARY_METRICS = ['转化率', '待支付率', '待支付转率', '个销占比'];
    const SUMMARY_TABLE_METRICS = ['添加数'].concat(SUMMARY_METRICS).concat(['ROI', '添加产值', '客单价']);
    const ORDER_STRUCT_DAYS = ['day3', 'day4', 'day5', 'day6', 'day7'];
    const ORDER_STRUCT_COLUMNS = ORDER_STRUCT_DAYS.map((day) => `${day}单数`);
    const CHENDU_METRICS = ['day1晨读', 'day2晨读', 'day3晨读', 'day4晨读', 'day5晨读'];
    const DAOBO_METRICS = ['day1到播', 'day2到播', 'day3到播', 'day4到播', 'day5到播', 'day6到播', 'day7到播'];
    const LIUCUN_METRICS = ['day1留存', 'day2留存', 'day3留存', 'day4留存', 'day5留存', 'day6留存', 'day7留存'];
    const DAY_METRICS = {
        day3: ['day3转率', 'day3到播转率', 'day3待支付率', 'day3待支付转率'],
        day4: ['day4转率', 'day4到播转率', 'day4待支付率', 'day4待支付转率'],
        day5: ['day5转率', 'day5到播转率', 'day5待支付率', 'day5待支付转率'],
        day6: ['day6转率', 'day6到播转率', 'day6待支付率', 'day6待支付转率'],
        day7: ['day7转率', 'day7到播转率', 'day7待支付率', 'day7待支付转率']
    };
    const ORDER_COUNT_COLUMNS = ['转化人数'].concat(ORDER_STRUCT_COLUMNS);
    const ALL_METRICS = PROCESS_METRICS.concat(CONVERSION_METRICS);
    const KEY_COLUMNS = ['营期', '班级', '添加人数'];
    const CLASS_CLEAN_RE = /[\(\（\*].*$/;

    function normalizeClassName(value) {
        if (value === null || value === undefined) {
            return '';
        }
        return String(value).trim().replace(CLASS_CLEAN_RE, '').trim();
    }

    function parseNumber(value) {
        if (value === null || value === undefined || value === '') {
            return 0;
        }
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }
        const cleaned = String(value).trim().replace(/,/g, '');
        const parsed = Number(cleaned);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function parsePct(value) {
        if (value === null || value === undefined || value === '') {
            return 0;
        }
        if (typeof value === 'number') {
            return Number.isFinite(value) ? value : 0;
        }
        const text = String(value).trim();
        if (!text) {
            return 0;
        }
        if (text.endsWith('%')) {
            return parseNumber(text.slice(0, -1)) / 100;
        }
        const parsed = parseNumber(text);
        return parsed > 1 ? parsed / 100 : parsed;
    }

    function parseInteger(value) {
        return Math.round(parseNumber(value));
    }

    function splitClassList(text) {
        return Array.from(
            new Set(
                String(text || '')
                    .split(/[\n,，、;；]+/)
                    .map((item) => normalizeClassName(item))
                    .filter(Boolean)
            )
        );
    }

    function formatHistoryLabel(historyYingqi) {
        const sorted = Array.from(new Set(historyYingqi)).sort((a, b) => a - b);
        if (sorted.length >= 2) {
            return `${sorted[0]}-${sorted[sorted.length - 1]}期均值`;
        }
        if (sorted.length === 1) {
            return `${sorted[0]}期`;
        }
        return '历史均值';
    }

    function prepareRows(rawRows, columns) {
        const missingKeyColumns = KEY_COLUMNS.filter((column) => !columns.includes(column));
        const missingOptionalColumns = ALL_METRICS
            .concat(SUMMARY_METRICS)
            .concat(['流水', '成本'])
            .concat(ORDER_COUNT_COLUMNS)
            .filter((column) => !columns.includes(column));
        const finalMissingOptionalColumns = (columns.includes('总成本') && !columns.includes('成本'))
            ? missingOptionalColumns.filter((column) => column !== '成本')
            : missingOptionalColumns;

        const preparedRows = rawRows.map((row, index) => {
            const prepared = {
                __index: index,
                原始班级: String(row['班级'] || ''),
                班级: normalizeClassName(row['班级']),
                大组: String(row['大组'] || '').trim(),
                营期: parseInteger(row['营期']),
                添加人数: parseNumber(row['添加人数']),
                流水: parseNumber(row['流水']),
                成本: parseNumber(row['成本'] !== undefined ? row['成本'] : row['总成本'])
            };

            ALL_METRICS.forEach((metric) => {
                prepared[metric] = parsePct(row[metric]);
            });

            SUMMARY_METRICS.forEach((metric) => {
                prepared[metric] = parsePct(row[metric]);
            });

            ORDER_COUNT_COLUMNS.forEach((column) => {
                prepared[column] = parseNumber(row[column]);
            });

            prepared.ROI = prepared.成本 > 0 ? prepared.流水 / prepared.成本 : 0;
            prepared.添加产值 = prepared.添加人数 > 0 ? prepared.流水 / prepared.添加人数 : 0;
            prepared.客单价 = prepared.转化人数 > 0 ? prepared.流水 / prepared.转化人数 : 0;
            return prepared;
        });

        return {
            rows: preparedRows,
            missingKeyColumns,
            missingOptionalColumns: finalMissingOptionalColumns
        };
    }

    function buildGroupConfig(groups) {
        const errors = [];
        const warnings = [];
        const classToAssignment = new Map();
        const normalizedGroups = [];

        groups.forEach((group, groupIndex) => {
            const name = String(group.name || '').trim();
            const testClasses = splitClassList(group.testText);
            const controlClasses = splitClassList(group.controlText);

            if (!name && (testClasses.length || controlClasses.length)) {
                errors.push(`第 ${groupIndex + 1} 个大组已填写班级，但未填写大组名称。`);
                return;
            }
            if (!name) {
                return;
            }
            if (!testClasses.length || !controlClasses.length) {
                errors.push(`大组“${name}”需要同时配置测试组和对照组班级。`);
                return;
            }

            normalizedGroups.push({
                name,
                testClasses,
                controlClasses
            });

            [['测试组', testClasses], ['对照组', controlClasses]].forEach(([abName, classList]) => {
                classList.forEach((className) => {
                    if (classToAssignment.has(className)) {
                        const previous = classToAssignment.get(className);
                        errors.push(`班级“${className}”被重复分配到“${previous.dazu}-${previous.ab}”和“${name}-${abName}”。`);
                        return;
                    }
                    classToAssignment.set(className, { dazu: name, ab: abName });
                });
            });
        });

        if (!normalizedGroups.length) {
            warnings.push('当前尚未配置任何有效大组，分析结果将无法生成。');
        }

        return {
            errors,
            warnings,
            normalizedGroups,
            classToAssignment
        };
    }

    function getAssignment(classToAssignment, className) {
        return classToAssignment.get(className) || { dazu: '其他', ab: '其他' };
    }

    function sum(values) {
        return values.reduce((acc, value) => acc + value, 0);
    }

    function safeDivide(numerator, denominator) {
        return denominator > 0 ? numerator / denominator : 0;
    }

    function metricNumeratorDenominator(row, metric) {
        const add = row['添加人数'];
        if (PROCESS_METRICS.includes(metric)) {
            return [row[metric] * add, add];
        }

        let matched = metric.match(/^day([3-7])转率$/);
        if (matched) {
            return [row[metric] * add, add];
        }
        matched = metric.match(/^day([3-7])待支付率$/);
        if (matched) {
            return [row[metric] * add, add];
        }
        matched = metric.match(/^day([3-7])待支付转率$/);
        if (matched) {
            const day = matched[1];
            const pending = add * row[`day${day}待支付率`];
            return [row[metric] * pending, pending];
        }
        matched = metric.match(/^day([3-7])到播转率$/);
        if (matched) {
            const day = matched[1];
            const live = add * row[`day${day}到播`];
            return [row[metric] * live, live];
        }
        matched = metric.match(/^d([3-7])到播待支付率$/);
        if (matched) {
            const day = matched[1];
            const live = add * row[`day${day}到播`];
            return [row[metric] * live, live];
        }
        matched = metric.match(/^d([3-7])到播待支付转率$/);
        if (matched) {
            const day = matched[1];
            const livePending = add * row[`day${day}到播`] * row[`d${day}到播待支付率`];
            return [row[metric] * livePending, livePending];
        }
        return [0, 0];
    }

    function aggregateMetrics(rows) {
        const result = {};
        ALL_METRICS.forEach((metric) => {
            let numerator = 0;
            let denominator = 0;
            rows.forEach((row) => {
                const pair = metricNumeratorDenominator(row, metric);
                numerator += pair[0];
                denominator += pair[1];
            });
            result[metric] = safeDivide(numerator, denominator);
        });
        return result;
    }

    function aggregateSummary(rows) {
        const addTotal = sum(rows.map((row) => row['添加人数']));
        const flowTotal = sum(rows.map((row) => row['流水']));
        const costTotal = sum(rows.map((row) => row['成本']));
        const conversionTotal = sum(rows.map((row) => row['转化人数']));
        const result = {};

        result['添加数'] = addTotal;
        ['转化率', '待支付率', '待支付转率'].forEach((metric) => {
            result[metric] = safeDivide(sum(rows.map((row) => row[metric] * row['添加人数'])), addTotal);
        });

        result['个销占比'] = flowTotal > 0
            ? safeDivide(sum(rows.map((row) => row['个销占比'] * row['流水'])), flowTotal)
            : safeDivide(sum(rows.map((row) => row['个销占比'] * row['添加人数'])), addTotal);
        result['ROI'] = safeDivide(flowTotal, costTotal);
        result['添加产值'] = safeDivide(flowTotal, addTotal);
        result['客单价'] = safeDivide(flowTotal, conversionTotal);
        return result;
    }

    function aggregateOrderStruct(rows) {
        const conversionTotal = sum(rows.map((row) => row['转化人数']));
        const result = {};
        ORDER_STRUCT_DAYS.forEach((day) => {
            result[day] = safeDivide(sum(rows.map((row) => row[`${day}单数`])), conversionTotal);
        });
        return result;
    }

    function buildSummaryRows(testSummary, controlSummary) {
        const rows = [
            Object.assign({ label: '测试组' }, testSummary),
            Object.assign({ label: '对照组' }, controlSummary)
        ];
        const diff = { label: '差值(测-对)' };
        SUMMARY_TABLE_METRICS.forEach((metric) => {
            diff[metric] = (testSummary[metric] || 0) - (controlSummary[metric] || 0);
        });
        rows.push(diff);
        const overallSummary = {};
        SUMMARY_TABLE_METRICS.forEach((metric) => {
            overallSummary[metric] = 0;
        });
        rows.push(Object.assign({ label: '整体' }, overallSummary));
        return rows;
    }

    function buildDiffSummaryRow(testSummary, controlSummary) {
        const diff = { label: '差值(测-对)' };
        SUMMARY_TABLE_METRICS.forEach((metric) => {
            diff[metric] = (testSummary[metric] || 0) - (controlSummary[metric] || 0);
        });
        return diff;
    }

    function buildMetricDetailRow(label, metricMap) {
        const row = { label };
        ALL_METRICS.forEach((metric) => {
            row[metric] = metricMap[metric] || 0;
        });
        return row;
    }

    function extractDailySales(metricMap) {
        const result = {};
        ORDER_STRUCT_DAYS.forEach((day) => {
            result[day] = DAY_METRICS[day].map((metric) => (metricMap[metric] || 0) * 100);
        });
        return result;
    }

    function buildSalesTrendSplit(rowSeriesMap) {
        const labels = ORDER_STRUCT_DAYS.map((day) => day.replace('day', 'Day'));
        const names = Object.keys(rowSeriesMap);
        const metricIndexes = {
            zhuanlv: 0,
            daizhifulv: 2,
            daizhifuzhuan: 3
        };
        return {
            zhuanlv: {
                labels,
                series: names.map((name) => ({
                    name,
                    data: ORDER_STRUCT_DAYS.map((day) => (rowSeriesMap[name][day] || [0, 0, 0, 0])[metricIndexes.zhuanlv])
                }))
            },
            daizhifulv: {
                labels,
                series: names.map((name) => ({
                    name,
                    data: ORDER_STRUCT_DAYS.map((day) => (rowSeriesMap[name][day] || [0, 0, 0, 0])[metricIndexes.daizhifulv])
                }))
            },
            daizhifuzhuan: {
                labels,
                series: names.map((name) => ({
                    name,
                    data: ORDER_STRUCT_DAYS.map((day) => (rowSeriesMap[name][day] || [0, 0, 0, 0])[metricIndexes.daizhifuzhuan])
                }))
            }
        };
    }

    function buildProcessDataset(testMetrics, controlMetrics, historyMetrics) {
        return {
            chendu: {
                labels: ['Day1', 'Day2', 'Day3', 'Day4', 'Day5'],
                series: [
                    { name: '测试组', data: CHENDU_METRICS.map((metric) => testMetrics[metric] * 100) },
                    { name: '对照组', data: CHENDU_METRICS.map((metric) => controlMetrics[metric] * 100) },
                    historyMetrics ? { name: '历史均值', data: CHENDU_METRICS.map((metric) => historyMetrics[metric] * 100) } : null
                ].filter(Boolean)
            },
            daobo: {
                labels: ['Day1', 'Day2', 'Day3', 'Day4', 'Day5', 'Day6', 'Day7'],
                series: [
                    { name: '测试组', data: DAOBO_METRICS.map((metric) => testMetrics[metric] * 100) },
                    { name: '对照组', data: DAOBO_METRICS.map((metric) => controlMetrics[metric] * 100) },
                    historyMetrics ? { name: '历史均值', data: DAOBO_METRICS.map((metric) => historyMetrics[metric] * 100) } : null
                ].filter(Boolean)
            },
            liucun: {
                labels: ['Day1', 'Day2', 'Day3', 'Day4', 'Day5', 'Day6', 'Day7'],
                series: [
                    { name: '测试组', data: LIUCUN_METRICS.map((metric) => testMetrics[metric] * 100) },
                    { name: '对照组', data: LIUCUN_METRICS.map((metric) => controlMetrics[metric] * 100) },
                    historyMetrics ? { name: '历史均值', data: LIUCUN_METRICS.map((metric) => historyMetrics[metric] * 100) } : null
                ].filter(Boolean)
            }
        };
    }

    function buildHeatmapDataset(rowMap, rowOrder, valueGetter) {
        const xLabels = ['Day3', 'Day4', 'Day5', 'Day6', 'Day7'];
        const yLabels = rowOrder;
        const values = [];
        rowOrder.forEach((rowLabel, yIndex) => {
            const rowValue = rowMap[rowLabel] || {};
            ORDER_STRUCT_DAYS.forEach((day, xIndex) => {
                values.push([xIndex, yIndex, valueGetter(rowValue, day)]);
            });
        });
        return { xLabels, yLabels, values };
    }

    function computeDashboard(rows, config) {
        const errors = [];
        const warnings = [];

        if (!rows.length) {
            errors.push('请先导入数据文件。');
            return { errors, warnings };
        }

        const targetYingqi = parseInteger(config.targetYingqi);
        const historyYingqi = Array.from(new Set((config.historyYingqi || []).map(parseInteger).filter((item) => item > 0))).sort((a, b) => a - b);
        if (!targetYingqi) {
            errors.push('请选择测试营期。');
        }
        if (!historyYingqi.length) {
            errors.push('请至少选择一个历史对照营期。');
        }

        const groupConfig = buildGroupConfig(config.groups || []);
        errors.push.apply(errors, groupConfig.errors);
        warnings.push.apply(warnings, groupConfig.warnings);
        if (errors.length) {
            return { errors, warnings };
        }

        const historyLabel = formatHistoryLabel(historyYingqi);
        const targetRows = rows.filter((row) => row['营期'] === targetYingqi);
        const historyRows = rows.filter((row) => historyYingqi.includes(row['营期']));

        if (!targetRows.length) {
            errors.push(`导入数据中不存在 ${targetYingqi} 期记录。`);
        }
        if (!historyRows.length) {
            errors.push('选定的历史营期在导入数据中没有任何记录。');
        }
        if (errors.length) {
            return { errors, warnings };
        }

        const rowsWithAssignment = rows.map((row) => {
            const assignment = getAssignment(groupConfig.classToAssignment, row['班级']);
            return Object.assign({}, row, {
                对应大组: assignment.dazu,
                测试分组: assignment.ab
            });
        });

        const targetWithAssignment = rowsWithAssignment.filter((row) => row['营期'] === targetYingqi);
        const targetABRows = targetWithAssignment.filter((row) => row['测试分组'] === '测试组' || row['测试分组'] === '对照组');
        const testRows = targetABRows.filter((row) => row['测试分组'] === '测试组');
        const controlRows = targetABRows.filter((row) => row['测试分组'] === '对照组');

        if (!testRows.length || !controlRows.length) {
            errors.push('当前配置下，测试营期内的测试组或对照组没有命中任何班级数据。');
            return { errors, warnings };
        }

        const configuredClassNames = Array.from(groupConfig.classToAssignment.keys());
        const allRowClassNames = new Set(rows.map((row) => row['班级']).filter(Boolean));
        const missingConfiguredClasses = configuredClassNames.filter((className) => !allRowClassNames.has(className));
        if (missingConfiguredClasses.length) {
            warnings.push(`有 ${missingConfiguredClasses.length} 个已配置班级未在导入数据中出现。`);
        }

        const targetUniqueClasses = Array.from(new Set(targetWithAssignment.map((row) => row['班级']).filter(Boolean)));
        const unassignedTargetClasses = targetUniqueClasses.filter((className) => !groupConfig.classToAssignment.has(className));
        if (unassignedTargetClasses.length) {
            warnings.push(`测试营期内有 ${unassignedTargetClasses.length} 个班级未被分配到任何大组。`);
        }

        const testMetrics = aggregateMetrics(testRows);
        const controlMetrics = aggregateMetrics(controlRows);
        const historyMetrics = aggregateMetrics(historyRows);
        const overallMetrics = aggregateMetrics(targetABRows);

        const testSummary = aggregateSummary(testRows);
        const controlSummary = aggregateSummary(controlRows);
        const historySummary = aggregateSummary(historyRows);
        const overallSummary = aggregateSummary(targetABRows);

        const overallSummaryRows = buildSummaryRows(testSummary, controlSummary);
        overallSummaryRows[3] = Object.assign({ label: '整体' }, overallSummary);

        const testOrder = aggregateOrderStruct(testRows);
        const controlOrder = aggregateOrderStruct(controlRows);
        const historyOrder = aggregateOrderStruct(historyRows);

        const classDetails = targetABRows
            .slice()
            .sort((a, b) => {
                const groupCompare = String(a['对应大组']).localeCompare(String(b['对应大组']), 'zh-CN');
                if (groupCompare !== 0) {
                    return groupCompare;
                }
                const abCompare = String(a['测试分组']).localeCompare(String(b['测试分组']), 'zh-CN');
                if (abCompare !== 0) {
                    return abCompare;
                }
                return String(a['班级']).localeCompare(String(b['班级']), 'zh-CN');
            })
            .map((row) => ({
                对应大组: row['对应大组'],
                测试分组: row['测试分组'],
                班级: row['班级'],
                添加人数: row['添加人数'],
                转化人数: row['转化人数'],
                转化率: row['转化率'],
                待支付率: row['待支付率'],
                待支付转率: row['待支付转率'],
                流水: row['流水'],
                成本: row['成本'],
                ROI: row['ROI'],
                添加产值: row['添加产值'],
                客单价: row['客单价']
            }));

        const overallDetailRows = [
            buildMetricDetailRow('测试组', testMetrics),
            buildMetricDetailRow('对照组', controlMetrics)
        ];
        const historyDetailRows = [
            buildMetricDetailRow(`${targetYingqi}期测试组`, testMetrics),
            buildMetricDetailRow(`${targetYingqi}期对照组`, controlMetrics),
            buildMetricDetailRow(historyLabel, historyMetrics)
        ];

        const groups = groupConfig.normalizedGroups.map((group) => {
            const groupTestRows = targetABRows.filter((row) => row['对应大组'] === group.name && row['测试分组'] === '测试组');
            const groupControlRows = targetABRows.filter((row) => row['对应大组'] === group.name && row['测试分组'] === '对照组');
            const groupTestSummary = aggregateSummary(groupTestRows);
            const groupControlSummary = aggregateSummary(groupControlRows);
            const groupTestMetrics = aggregateMetrics(groupTestRows);
            const groupControlMetrics = aggregateMetrics(groupControlRows);
            const groupTestOrder = aggregateOrderStruct(groupTestRows);
            const groupControlOrder = aggregateOrderStruct(groupControlRows);
            const groupTestDailySales = extractDailySales(groupTestMetrics);
            const groupControlDailySales = extractDailySales(groupControlMetrics);

            return {
                name: group.name,
                shortName: group.name,
                summaryRows: [
                    Object.assign({ label: '测试组' }, groupTestSummary),
                    Object.assign({ label: '对照组' }, groupControlSummary),
                    buildDiffSummaryRow(groupTestSummary, groupControlSummary)
                ],
                process: buildProcessDataset(groupTestMetrics, groupControlMetrics, null),
                salesTrend: buildSalesTrendSplit({
                    [`${group.name}-测试组`]: groupTestDailySales,
                    [`${group.name}-对照组`]: groupControlDailySales
                }),
                dailySales: {
                    [`${group.name}-测试组`]: groupTestDailySales,
                    [`${group.name}-对照组`]: groupControlDailySales
                },
                orderHeatmap: buildHeatmapDataset(
                    {
                        [`${group.name}-测试组`]: groupTestOrder,
                        [`${group.name}-对照组`]: groupControlOrder
                    },
                    [`${group.name}-测试组`, `${group.name}-对照组`],
                    (rowValue, day) => (rowValue[day] || 0) * 100
                ),
                detailRows: [
                    Object.assign({ 大组: group.name }, buildMetricDetailRow('测试组', groupTestMetrics)),
                    Object.assign({ 大组: group.name }, buildMetricDetailRow('对照组', groupControlMetrics))
                ]
            };
        });

        const groupSummaryRows = groups.flatMap((group) => group.summaryRows.map((row) => Object.assign({ 大组: group.name }, row)));
        const groupDetailRows = groups.flatMap((group) => group.detailRows);
        const groupProcess = {
            chendu: {
                labels: ['Day1', 'Day2', 'Day3', 'Day4', 'Day5'],
                series: groups.flatMap((group) => [
                    { name: `${group.name}-测试组`, data: group.process.chendu.series[0].data },
                    { name: `${group.name}-对照组`, data: group.process.chendu.series[1].data }
                ])
            },
            daobo: {
                labels: ['Day1', 'Day2', 'Day3', 'Day4', 'Day5', 'Day6', 'Day7'],
                series: groups.flatMap((group) => [
                    { name: `${group.name}-测试组`, data: group.process.daobo.series[0].data },
                    { name: `${group.name}-对照组`, data: group.process.daobo.series[1].data }
                ])
            },
            liucun: {
                labels: ['Day1', 'Day2', 'Day3', 'Day4', 'Day5', 'Day6', 'Day7'],
                series: groups.flatMap((group) => [
                    { name: `${group.name}-测试组`, data: group.process.liucun.series[0].data },
                    { name: `${group.name}-对照组`, data: group.process.liucun.series[1].data }
                ])
            }
        };
        const groupDailySalesMap = {};
        groups.forEach((group) => {
            Object.keys(group.dailySales).forEach((name) => {
                groupDailySalesMap[name] = group.dailySales[name];
            });
        });
        const overallDailySales = {
            测试组: extractDailySales(testMetrics),
            对照组: extractDailySales(controlMetrics)
        };
        const historyDailySales = {
            [`${targetYingqi}期测试组`]: extractDailySales(testMetrics),
            [`${targetYingqi}期对照组`]: extractDailySales(controlMetrics),
            [historyLabel]: extractDailySales(historyMetrics)
        };

        return {
            errors,
            warnings,
            historyLabel,
            targetYingqi,
            historyYingqi,
            metadata: {
                totalRows: rows.length,
                targetRows: targetRows.length,
                matchedClasses: configuredClassNames.length - missingConfiguredClasses.length,
                configuredClasses: configuredClassNames.length,
                unassignedTargetClassCount: unassignedTargetClasses.length,
                groupCount: groupConfig.normalizedGroups.length,
                missingConfiguredClasses,
                unassignedTargetClasses
            },
            overall: {
                summaryRows: overallSummaryRows,
                process: buildProcessDataset(testMetrics, controlMetrics, null),
                salesTrend: buildSalesTrendSplit(overallDailySales),
                dailySales: overallDailySales,
                orderHeatmap: buildHeatmapDataset(
                    { 测试组: testOrder, 对照组: controlOrder },
                    ['测试组', '对照组'],
                    (rowValue, day) => (rowValue[day] || 0) * 100
                ),
                classDetails,
                detailRows: overallDetailRows
            },
            byGroup: {
                summaryRows: groupSummaryRows,
                groups,
                process: groupProcess,
                salesTrend: buildSalesTrendSplit(groupDailySalesMap),
                dailySales: groupDailySalesMap,
                orderHeatmap: buildHeatmapDataset(
                    Object.fromEntries(
                        groups.flatMap((group) => [
                            [`${group.name}-测试组`, aggregateOrderStruct(targetABRows.filter((row) => row['对应大组'] === group.name && row['测试分组'] === '测试组'))],
                            [`${group.name}-对照组`, aggregateOrderStruct(targetABRows.filter((row) => row['对应大组'] === group.name && row['测试分组'] === '对照组'))]
                        ])
                    ),
                    groups.flatMap((group) => [`${group.name}-测试组`, `${group.name}-对照组`]),
                    (rowValue, day) => (rowValue[day] || 0) * 100
                ),
                detailRows: groupDetailRows
            },
            history: {
                summaryRows: [
                    Object.assign({ label: `${targetYingqi}期测试组` }, testSummary),
                    Object.assign({ label: `${targetYingqi}期对照组` }, controlSummary),
                    Object.assign({ label: historyLabel }, historySummary)
                ],
                process: buildProcessDataset(testMetrics, controlMetrics, historyMetrics),
                salesTrend: buildSalesTrendSplit(historyDailySales),
                dailySales: historyDailySales,
                orderHeatmap: buildHeatmapDataset(
                    {
                        [`${targetYingqi}期测试组`]: testOrder,
                        [`${targetYingqi}期对照组`]: controlOrder,
                        [historyLabel]: historyOrder
                    },
                    [`${targetYingqi}期测试组`, `${targetYingqi}期对照组`, historyLabel],
                    (rowValue, day) => (rowValue[day] || 0) * 100
                ),
                detailRows: historyDetailRows
            },
            reference: {
                overallMetrics
            }
        };
    }

    window.ABToolMetrics = {
        PROCESS_METRICS,
        CONVERSION_METRICS,
        SUMMARY_METRICS,
        SUMMARY_TABLE_METRICS,
        ORDER_STRUCT_DAYS,
        CHENDU_METRICS,
        DAOBO_METRICS,
        LIUCUN_METRICS,
        DAY_METRICS,
        ALL_METRICS,
        KEY_COLUMNS,
        normalizeClassName,
        parseNumber,
        parsePct,
        parseInteger,
        splitClassList,
        formatHistoryLabel,
        prepareRows,
        computeDashboard
    };
})();
