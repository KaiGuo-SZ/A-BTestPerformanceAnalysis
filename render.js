(function () {
    const chartStore = new Map();
    const palette = ['#0d6efd', '#6c757d', '#198754', '#dc3545', '#6610f2', '#fd7e14'];
    const percentKeys = new Set(['转化率', '待支付率', '待支付转率', '个销占比']);
    const floatKeys = new Set(['ROI', '添加产值', '客单价']);
    const integerKeys = new Set(['添加人数', '转化人数', '添加数']);
    const moneyKeys = new Set(['流水', '成本']);
    const detailColumns = window.ABToolMetrics.ALL_METRICS;

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatPercent(value) {
        return `${(Number(value || 0) * 100).toFixed(2)}%`;
    }

    function formatSignedPercent(value) {
        const number = Number(value || 0) * 100;
        return `${number >= 0 ? '+' : ''}${number.toFixed(2)}%`;
    }

    function formatFloat(value) {
        return Number(value || 0).toFixed(2);
    }

    function formatSignedFloat(value) {
        const number = Number(value || 0);
        return `${number >= 0 ? '+' : ''}${number.toFixed(2)}`;
    }

    function formatInteger(value) {
        return `${Math.round(Number(value || 0))}`;
    }

    function formatMoney(value) {
        return Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 });
    }

    function formatChartNumber(value) {
        return Number(value || 0).toFixed(1);
    }

    function simplifyLegendName(name) {
        return String(name || '').replace(/社群/g, '');
    }

    function renderAlerts(container, errors, warnings) {
        if (!container) {
            return;
        }
        const sections = [];
        if (errors && errors.length) {
            sections.push(`
                <div class="alert alert-danger" role="alert">
                    <div class="fw-semibold mb-1">当前配置无法生成结果</div>
                    <ul class="warning-list">${errors.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                </div>
            `);
        }
        if (warnings && warnings.length) {
            sections.push(`
                <div class="alert alert-warning" role="alert">
                    <div class="fw-semibold mb-1">分析提示</div>
                    <ul class="warning-list">${warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
                </div>
            `);
        }
        container.innerHTML = sections.join('');
    }

    function formatCell(key, value, row) {
        const isDiff = row && row.label === '差值(测-对)';
        if (percentKeys.has(key)) {
            const text = isDiff ? formatSignedPercent(value) : formatPercent(value);
            if (isDiff) {
                const cls = Number(value || 0) > 0 ? 'diff-pos' : Number(value || 0) < 0 ? 'diff-neg' : 'diff-zero';
                return `<span class="${cls}">${text}</span>`;
            }
            return text;
        }
        if (floatKeys.has(key)) {
            const text = isDiff ? formatSignedFloat(value) : formatFloat(value);
            if (isDiff) {
                const cls = Number(value || 0) > 0 ? 'diff-pos' : Number(value || 0) < 0 ? 'diff-neg' : 'diff-zero';
                return `<span class="${cls}">${text}</span>`;
            }
            return text;
        }
        if (integerKeys.has(key)) {
            return formatInteger(value);
        }
        if (moneyKeys.has(key)) {
            return formatMoney(value);
        }
        return escapeHtml(value);
    }

    function renderBasicTable(container, columns, rows, headerLabels) {
        if (!container) {
            return;
        }
        const headers = columns.map((column) => `<th>${escapeHtml((headerLabels && headerLabels[column]) || column)}</th>`).join('');
        const body = rows.map((row) => `
            <tr>
                ${columns.map((column, index) => (
                    index < 2 && (column === 'label' || column === '大组')
                        ? `<th>${escapeHtml(row[column])}</th>`
                        : `<td>${formatCell(column, row[column], row)}</td>`
                )).join('')}
            </tr>
        `).join('');
        container.innerHTML = `<table class="table table-sm table-striped table-bordered table-hover"><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`;
    }

    function renderSummaryTable(container, rows) {
        renderBasicTable(container, ['label', '添加数', '转化率', '待支付率', '待支付转率', '个销占比', 'ROI', '添加产值', '客单价'], rows);
    }

    function renderGroupSummaryTable(container, rows) {
        if (!container) {
            return;
        }
        const grouped = [];
        rows.forEach((row) => {
            let item = grouped.find((entry) => entry.name === row['大组']);
            if (!item) {
                item = { name: row['大组'], rows: [] };
                grouped.push(item);
            }
            item.rows.push(row);
        });
        const body = grouped.map((group) => group.rows.map((row, index) => `
            <tr>
                ${index === 0 ? `<th rowspan="${group.rows.length}" valign="top">${escapeHtml(group.name)}</th>` : ''}
                <th>${escapeHtml(row.label)}</th>
                <td>${formatCell('添加数', row['添加数'], row)}</td>
                <td>${formatCell('转化率', row['转化率'], row)}</td>
                <td>${formatCell('待支付率', row['待支付率'], row)}</td>
                <td>${formatCell('待支付转率', row['待支付转率'], row)}</td>
                <td>${formatCell('个销占比', row['个销占比'], row)}</td>
                <td>${formatCell('ROI', row['ROI'], row)}</td>
                <td>${formatCell('添加产值', row['添加产值'], row)}</td>
                <td>${formatCell('客单价', row['客单价'], row)}</td>
            </tr>
        `).join('')).join('');
        container.innerHTML = `
            <table class="table table-sm table-striped table-bordered table-hover">
                <thead>
                    <tr>
                        <th></th><th></th><th>添加数</th><th>转化率</th><th>待支付率</th><th>待支付转率</th><th>个销占比</th><th>ROI</th><th>添加产值</th><th>客单价</th>
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>
        `;
    }

    function renderMetricDetailTable(container, rows, includeGroupColumn) {
        if (!container) {
            return;
        }
        const header = includeGroupColumn ? '<th></th><th></th>' : '<th></th>';
        let body = '';
        if (includeGroupColumn) {
            const grouped = [];
            rows.forEach((row) => {
                let item = grouped.find((entry) => entry.name === row['大组']);
                if (!item) {
                    item = { name: row['大组'], rows: [] };
                    grouped.push(item);
                }
                item.rows.push(row);
            });
            body = grouped.map((group) => group.rows.map((row, index) => `
                <tr>
                    ${index === 0 ? `<th rowspan="${group.rows.length}" valign="top">${escapeHtml(group.name)}</th>` : ''}
                    <th>${escapeHtml(row.label)}</th>
                    ${detailColumns.map((column) => `<td>${formatPercent(row[column])}</td>`).join('')}
                </tr>
            `).join('')).join('');
        } else {
            body = rows.map((row) => `
                <tr>
                    <th>${escapeHtml(row.label)}</th>
                    ${detailColumns.map((column) => `<td>${formatPercent(row[column])}</td>`).join('')}
                </tr>
            `).join('');
        }
        container.innerHTML = `
            <table class="table table-sm table-striped table-bordered table-hover">
                <thead>
                    <tr>${header}${detailColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>
                </thead>
                <tbody>${body}</tbody>
            </table>
        `;
    }

    function renderClassTable(container, rows) {
        if (!container) {
            return;
        }
        const headers = ['对应大组', '测试分组', '班级', '添加人数', '转化人数', '转化率', '待支付率', '待支付转率', '流水', '成本', 'ROI', '添加产值', '客单价'];
        container.innerHTML = `
            <table class="table table-sm table-striped table-bordered table-hover">
                <thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>
                <tbody>
                    ${rows.map((row) => `
                        <tr>
                            <td>${escapeHtml(row['对应大组'])}</td>
                            <td>${row['测试分组'] === '测试组' ? '<span class="badge text-bg-success">测试组</span>' : '<span class="badge text-bg-secondary">对照组</span>'}</td>
                            <td>${escapeHtml(row['班级'])}</td>
                            <td>${formatInteger(row['添加人数'])}</td>
                            <td>${formatInteger(row['转化人数'])}</td>
                            <td>${formatPercent(row['转化率'])}</td>
                            <td>${formatPercent(row['待支付率'])}</td>
                            <td>${formatPercent(row['待支付转率'])}</td>
                            <td>${formatMoney(row['流水'])}</td>
                            <td>${formatMoney(row['成本'])}</td>
                            <td>${formatFloat(row['ROI'])}</td>
                            <td>${formatFloat(row['添加产值'])}</td>
                            <td>${formatFloat(row['客单价'])}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    function getChartInstance(elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            return null;
        }
        let chart = chartStore.get(elementId);
        if (!chart) {
            chart = window.echarts.init(element);
            chartStore.set(elementId, chart);
        }
        return chart;
    }

    function setChartOption(elementId, option) {
        const chart = getChartInstance(elementId);
        if (chart) {
            chart.setOption(option, true);
        }
    }

    function renderLineChart(elementId, labels, series, suffix) {
        setChartOption(elementId, {
            color: palette,
            tooltip: {
                trigger: 'axis',
                valueFormatter(value) {
                    return `${formatChartNumber(value)}${suffix || ''}`;
                }
            },
            legend: { type: 'scroll', top: 0 },
            grid: { left: 48, right: 18, top: 48, bottom: 36 },
            xAxis: { type: 'category', data: labels },
            yAxis: { type: 'value', axisLabel: { formatter: (value) => `${value}${suffix || ''}` } },
            series: series.map((item) => ({
                name: simplifyLegendName(item.name),
                type: 'line',
                smooth: true,
                symbolSize: 6,
                label: {
                    show: true,
                    position: 'top',
                    formatter(params) {
                        return `${formatChartNumber(params.value)}${suffix || ''}`;
                    }
                },
                data: item.data.map((value) => Number(value || 0).toFixed(1))
            }))
        });
    }

    function renderHeatmap(elementId, dataset) {
        const isConversion = dataset && dataset.scheme === 'conversion';
        
        // Premium Data Viz color scales
        const blueScale = ['#F8FAFC', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155'];
        const blueAccents = ['#F4F6FB', '#E0EAFF', '#BCD4F8', '#86B2F4', '#4688F1', '#1A73E8', '#1056C0'];
        const emeraldAccents = ['#F2FCF5', '#D1F5E1', '#A0E8C1', '#62D49D', '#32B97A', '#19995A', '#0D7240'];
        
        const colors = isConversion ? emeraldAccents : blueAccents;

        const values = (dataset && dataset.values) ? dataset.values : [];
        const maxValue = values.reduce((acc, item) => Math.max(acc, Number(item[2] || 0)), 0);
        // Calculate a clean maximum for visual map
        const visualMax = maxValue > 0 ? Math.ceil(maxValue * 10) / 10 : 1;
        const visualText = isConversion ? ['高转化', '低转化'] : ['高占比', '低占比'];

        setChartOption(elementId, {
            backgroundColor: 'transparent',
            tooltip: {
                position: 'top',
                backgroundColor: '#1E293B', // Slate-800
                borderColor: '#334155', // Slate-700
                borderWidth: 1,
                padding: [12, 16],
                borderRadius: 8,
                shadowColor: 'rgba(0, 0, 0, 0.15)',
                shadowBlur: 16,
                textStyle: {
                    color: '#F8FAFC',
                    fontSize: 13,
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                },
                formatter(params) {
                    const highlightColor = isConversion ? '#62D49D' : '#86B2F4';
                    return `
                        <div style="font-size:12px;color:#94A3B8;margin-bottom:6px;">${dataset.xLabels[params.value[0]]}</div>
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-weight:500;font-size:14px;color:#F8FAFC;">${dataset.yLabels[params.value[1]]}</span>
                            <span style="font-weight:700;font-size:15px;color:${highlightColor};">${Number(params.value[2] || 0).toFixed(1)}%</span>
                        </div>
                    `;
                }
            },
            grid: {
                left: 80,
                right: 90,
                top: 45,
                bottom: 10,
                containLabel: false
            },
            xAxis: {
                type: 'category',
                position: 'top',
                data: dataset.xLabels,
                axisTick: { show: false },
                axisLine: { show: false },
                splitArea: { show: false },
                axisLabel: {
                    color: '#64748B',
                    fontSize: 13,
                    fontWeight: 600,
                    margin: 12
                }
            },
            yAxis: {
                type: 'category',
                data: dataset.yLabels,
                axisTick: { show: false },
                axisLine: { show: false },
                splitArea: { show: false },
                axisLabel: {
                    color: '#334155',
                    fontSize: 13,
                    fontWeight: 600,
                    margin: 16
                }
            },
            visualMap: {
                min: 0,
                max: visualMax,
                calculable: true,
                orient: 'vertical',
                right: 15,
                top: 'middle',
                itemHeight: 110,
                itemWidth: 10,
                text: visualText,
                textGap: 10,
                textStyle: {
                    color: '#64748B',
                    fontSize: 12,
                    fontWeight: 500
                },
                formatter(value) {
                    return `${Number(value).toFixed(1)}%`;
                },
                inRange: { color: colors }
            },
            series: [{
                type: 'heatmap',
                data: dataset.values,
                itemStyle: {
                    borderRadius: 6,
                    borderWidth: 3,
                    borderColor: '#ffffff'
                },
                label: {
                    show: true,
                    color: '#0F172A',
                    textBorderColor: '#FFFFFF',
                    textBorderWidth: 2.5,
                    fontWeight: 700,
                    fontSize: 13,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    formatter: (params) => {
                        const val = Number(params.value[2] || 0);
                        return val > 0 ? `${val.toFixed(1)}%` : '-';
                    }
                },
                emphasis: {
                    itemStyle: {
                        shadowBlur: 14,
                        shadowColor: 'rgba(15, 23, 42, 0.15)',
                        borderColor: '#ffffff',
                        borderWidth: 3
                    }
                }
            }]
        });
    }

    function buildConversionHeatmapDataset(dailySalesMap) {
        const dayKeys = window.ABToolMetrics.ORDER_STRUCT_DAYS;
        const xLabels = dayKeys.map((day) => day.replace('day', 'Day'));
        const seriesNames = Object.keys(dailySalesMap);
        const yLabels = seriesNames.map((name) => simplifyLegendName(name));
        const values = [];
        yLabels.forEach((_, yIndex) => {
            const originName = seriesNames[yIndex];
            dayKeys.forEach((day, xIndex) => {
                const dayData = dailySalesMap[originName] && dailySalesMap[originName][day];
                const value = dayData ? dayData[0] : 0;
                values.push([xIndex, yIndex, Number(value || 0)]);
            });
        });
        return { xLabels, yLabels, values, scheme: 'conversion' };
    }

    function renderTrendSplit(prefix, trendData) {
        renderLineChart(`${prefix}-zhuanlv`, trendData.zhuanlv.labels, trendData.zhuanlv.series, '%');
        renderLineChart(`${prefix}-daizhifulv`, trendData.daizhifulv.labels, trendData.daizhifulv.series, '%');
        renderLineChart(`${prefix}-daizhifuzhuan`, trendData.daizhifuzhuan.labels, trendData.daizhifuzhuan.series, '%');
    }

    function renderSummaryComparisonChart(elementId, rows) {
        const validRows = rows.filter((row) => row.label !== '差值(测-对)');
        const metrics = ['转化率', '待支付率', '待支付转率', '个销占比'];
        const primaryMetrics = new Set(['转化率', '待支付率']);
        const series = [];
        const legend = [];

        validRows.forEach((row) => {
            const rawName = row['大组'] ? `${row['大组']}-${row.label}` : row.label;
            const name = simplifyLegendName(rawName);
            legend.push(name);
            series.push({
                name,
                type: 'bar',
                yAxisIndex: 0,
                barMaxWidth: 26,
                data: metrics.map((metric) => (primaryMetrics.has(metric) ? (row[metric] || 0) * 100 : null)),
                label: {
                    show: true,
                    position: 'top',
                    formatter(params) {
                        if (params.value === null || params.value === undefined) {
                            return '';
                        }
                        return `${formatChartNumber(params.value)}%`;
                    }
                }
            });
            series.push({
                name,
                type: 'bar',
                yAxisIndex: 1,
                barMaxWidth: 26,
                data: metrics.map((metric) => (primaryMetrics.has(metric) ? null : (row[metric] || 0) * 100)),
                label: {
                    show: true,
                    position: 'top',
                    formatter(params) {
                        if (params.value === null || params.value === undefined) {
                            return '';
                        }
                        return `${formatChartNumber(params.value)}%`;
                    }
                }
            });
        });

        setChartOption(elementId, {
            color: palette,
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                valueFormatter(value) {
                    return `${formatChartNumber(value)}%`;
                }
            },
            legend: { type: 'scroll', top: 0, data: legend },
            grid: { left: 48, right: 48, top: 48, bottom: 36 },
            xAxis: { type: 'category', data: metrics },
            yAxis: [
                { type: 'value', axisLabel: { formatter: (value) => `${value}%` } },
                { type: 'value', axisLabel: { formatter: (value) => `${value}%` } }
            ],
            series
        });
    }

    function renderMeta(headerElements, result) {
        headerElements.title.textContent = `${result.targetYingqi}期 AB 测试分析结果`;
        headerElements.desc.textContent = `历史对照：${result.historyLabel}；已配置 ${result.metadata.groupCount} 个大组；命中 ${result.metadata.matchedClasses}/${result.metadata.configuredClasses} 个已配置班级。`;
        headerElements.badges.innerHTML = `
            <span class="badge-soft">测试营期 ${result.targetYingqi} 期</span>
            <span class="badge-soft">历史营期 ${result.historyYingqi.join(', ')}</span>
            <span class="badge-soft-muted">未分组班级 ${result.metadata.unassignedTargetClassCount}</span>
        `;
        const groupDesc = document.getElementById('group-section-desc');
        if (groupDesc) {
            groupDesc.textContent = `${result.byGroup.groups.map((group) => simplifyLegendName(group.name)).join(' / ')} × 测试组 / 对照组`;
        }
        const historyDesc = document.getElementById('history-section-desc');
        if (historyDesc) {
            historyDesc.textContent = `${result.targetYingqi}期测试/对照 vs ${result.historyLabel}`;
        }
    }

    function renderOverall(result) {
        renderSummaryTable(document.getElementById('overall-summary-table'), result.overall.summaryRows);
        renderMetricDetailTable(document.getElementById('overall-detail-table'), result.overall.detailRows, false);
        renderClassTable(document.getElementById('overall-class-table'), result.overall.classDetails);
        renderSummaryComparisonChart('chart-summary', [
            result.overall.summaryRows[0],
            result.overall.summaryRows[1],
            result.overall.summaryRows[3]
        ]);
        renderLineChart('chart-overall-chendu', result.overall.process.chendu.labels, result.overall.process.chendu.series, '%');
        renderLineChart('chart-overall-daobo', result.overall.process.daobo.labels, result.overall.process.daobo.series, '%');
        renderLineChart('chart-overall-liucun', result.overall.process.liucun.labels, result.overall.process.liucun.series, '%');
        renderHeatmap('chart-overall-order-heatmap', result.overall.orderHeatmap);
        renderHeatmap('chart-overall-conversion-heatmap', buildConversionHeatmapDataset(result.overall.dailySales));
        renderTrendSplit('chart-overall-sales-trend', result.overall.salesTrend);
    }

    function renderGroup(result) {
        renderGroupSummaryTable(document.getElementById('group-summary-table'), result.byGroup.summaryRows);
        renderMetricDetailTable(document.getElementById('group-detail-table'), result.byGroup.detailRows, true);
        renderSummaryComparisonChart('chart-dazu-summary', result.byGroup.summaryRows);
        renderLineChart('chart-dazu-chendu', result.byGroup.process.chendu.labels, result.byGroup.process.chendu.series, '%');
        renderLineChart('chart-dazu-daobo', result.byGroup.process.daobo.labels, result.byGroup.process.daobo.series, '%');
        renderLineChart('chart-dazu-liucun', result.byGroup.process.liucun.labels, result.byGroup.process.liucun.series, '%');
        renderHeatmap('chart-dazu-order-heatmap', result.byGroup.orderHeatmap);
        renderHeatmap('chart-dazu-conversion-heatmap', buildConversionHeatmapDataset(result.byGroup.dailySales));
        renderTrendSplit('chart-dazu-sales-trend', result.byGroup.salesTrend);
    }

    function renderHistory(result) {
        renderSummaryTable(document.getElementById('history-summary-table'), result.history.summaryRows);
        renderMetricDetailTable(document.getElementById('history-detail-table'), result.history.detailRows, false);
        renderSummaryComparisonChart('chart-history-summary', result.history.summaryRows);
        renderLineChart('chart-history-chendu', result.history.process.chendu.labels, result.history.process.chendu.series, '%');
        renderLineChart('chart-history-daobo', result.history.process.daobo.labels, result.history.process.daobo.series, '%');
        renderLineChart('chart-history-liucun', result.history.process.liucun.labels, result.history.process.liucun.series, '%');
        renderHeatmap('chart-history-order-heatmap', result.history.orderHeatmap);
        renderHeatmap('chart-history-conversion-heatmap', buildConversionHeatmapDataset(result.history.dailySales));
        renderTrendSplit('chart-history-sales-trend', result.history.salesTrend);
    }

    function resizeCharts() {
        chartStore.forEach((chart) => chart.resize());
    }

    window.addEventListener('resize', resizeCharts);

    window.ABToolRender = {
        renderAlerts,
        renderMeta,
        renderOverall,
        renderGroup,
        renderHistory,
        resizeCharts
    };
})();
