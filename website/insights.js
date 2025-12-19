// Insights page JavaScript
(function() {
    'use strict';

    const FALLBACK_PROVIDER_RGB = {
        'OpenAI': '16 163 127',
        'Google': '251 191 36',
        'Anthropic': '248 113 113',
        'DeepSeek': '59 130 246',
        'Mistral AI': '251 146 60',
        'xAI': '217 70 239',
        'Alibaba': '139 92 246',
        'Moonshot AI': '14 165 233',
        'Perplexity': '100 116 139',
        'Meta': '148 163 184',
        'Other': '100 116 139',
        'Unknown': '100 116 139',
    };

    const MODEL_VARIANTS = [-0.16, -0.12, -0.08, -0.04, 0, 0.04, 0.08, 0.12, 0.16];

    // Heuristic keyword themes (qualitative, self-reported writeups).
    const THEME_DEFINITIONS = {
        strengths: [
            {
                label: 'Step-by-step derivations',
                patterns: [
                    /step[- ]by[- ]step/i,
                    /\bderiv(e|ed|ation|ations)\b/i,
                    /intermediate steps?/i,
                    /worked through/i,
                    /chain[- ]of[- ]thought/i,
                    /reasoning step/i,
                ],
            },
            {
                label: 'Conceptual explanations / intuition',
                patterns: [
                    /\bconceptual\b/i,
                    /\bintuition\b/i,
                    /\bhigh[- ]level\b/i,
                    /clear (explanation|explanations)/i,
                    /explained (why|how)/i,
                    /clarif(y|ying|ication)/i,
                ],
            },
            {
                label: 'One-shot / high correctness',
                patterns: [
                    /one[- ]shot/i,
                    /first (try|attempt)/i,
                    /solved (everything|all).*(correct|accurate)/i,
                    /99%\s*accuracy/i,
                    /zero (arithmetic|math|numerical) errors/i,
                    /no (arithmetic|math|numerical) errors/i,
                ],
            },
            {
                label: 'Strong linear algebra / calculus',
                patterns: [
                    /linear algebra/i,
                    /\bmatrix\b/i,
                    /\bcalculus\b/i,
                    /\bgradient(s)?\b/i,
                    /\bsvd\b/i,
                    /\boptimization\b/i,
                ],
            },
            {
                label: 'Structured / well-formatted output',
                patterns: [
                    /\bstructured\b/i,
                    /\bwell[- ]organized\b/i,
                    /\bclear\b.*\bsteps\b/i,
                    /\bformat\b/i,
                    /\bconsistent\b.*\bnotation\b/i,
                ],
            },
            {
                label: '"Thinking"/reasoning modes helpful',
                patterns: [
                    /extended thinking/i,
                    /\bthinking mode\b/i,
                    /\bdeep think\b/i,
                    /\breasoning mode\b/i,
                    /chain[- ]of[- ]thought/i,
                ],
            },
        ],
        weaknesses: [
            {
                label: 'Math mistakes (sign/constant/algebra)',
                patterns: [
                    /sign error/i,
                    /missing (a )?constant/i,
                    /\balgebra(ic)?\b.*(mistake|error)/i,
                    /math(ematical)? (mistake|error)/i,
                    /numerical (mistake|error)/i,
                    /\barithmetic (mistake|error)\b/i,
                    /\bovercount(ed|ing)?\b/i,
                    /\bincorrect\b/i,
                    /\bwrong\b/i,
                ],
                negative: [
                    /no (arithmetic|math|numerical) errors/i,
                    /zero (arithmetic|math|numerical) errors/i,
                    /\bwithout (any )?errors\b/i,
                ],
            },
            {
                label: 'Needs reprompting / user steering',
                patterns: [
                    /re-?prompt/i,
                    /needed (a|to) (re|another) prompt/i,
                    /had to (re|)prompt/i,
                    /required (two|multiple|several) prompts?/i,
                    /only after (i|we)/i,
                    /after (i|we) (explicitly|specifically|directly)/i,
                    /when (i|we) pointed out/i,
                    /\bsteer(ing)?\b/i,
                    /\bnudge(d)?\b/i,
                    /\bfeedback\b/i,
                ],
            },
            {
                label: 'Missing intermediate steps / too terse',
                patterns: [
                    /without showing/i,
                    /did(n't| not) show/i,
                    /skipped (steps|derivation)/i,
                    /condensed/i,
                    /\bincomplete\b/i,
                    /lacked (explanation|detail|steps)/i,
                    /final formulas without/i,
                ],
            },
            {
                label: 'Prompt misinterpretation / ambiguity',
                patterns: [
                    /misinterpret/i,
                    /misunderstand/i,
                    /parsing error/i,
                    /\bambigu(ity|ous)\b/i,
                    /interpreted .* as/i,
                    /wrong (assumption|interpretation|cost model)/i,
                ],
            },
            {
                label: 'PDF/image/vision limitations',
                patterns: [
                    /(can'?t|cannot|unable to|could(n't| not)|failed to) (read|parse|interpret).*(image|screenshot|pdf)/i,
                    /(image|screenshot|pdf).*(hallucinat|guess|made up)/i,
                    /\bocr\b/i,
                    /pdf.*(parsing|formatting)/i,
                    /vision.*(issue|problem|fail)/i,
                ],
            },
            {
                label: 'Hallucination / guessing',
                patterns: [
                    /\bhallucinat(e|ed|ion|ions)\b/i,
                    /\bmade up\b/i,
                    /\bfabricat(ed|ion)\b/i,
                    /\bguess(ing|ed)?\b/i,
                    /\binvent(ed|ing)?\b/i,
                ],
                negative: [
                    /no hallucinat/i,
                    /did(n't| not) hallucinat/i,
                    /not (a )?hallucinat/i,
                ],
            },
            {
                label: 'Ineffective self-checking / overconfidence',
                patterns: [
                    /overconfiden(t|ce)/i,
                    /\bself[- ]check(ing)?\b/i,
                    /\bself[- ]examination\b/i,
                    /never flagged/i,
                    /rarely identified/i,
                    /did(n't| not) catch/i,
                    /\buncertain(ty)?\b.*(not|never|rarely)/i,
                ],
            },
            {
                label: 'Refusal / tutor mode',
                patterns: [
                    /\brefus(e|ed|al)\b/i,
                    /would(n't| not).*(give|provide).*(answer|solution)/i,
                    /won't.*(give|provide).*(answer|solution)/i,
                    /\bpolicy\b/i,
                    /\btutor\b/i,
                    /\bpedagogical\b/i,
                    /encourag.*(me|us) to work/i,
                ],
            },
        ],
    };

    function onReady() {
        try {
            initInsightsPage();
        } catch (error) {
            console.error('Insights init failed:', error);
            renderUnexpectedError();
        }

        applyPillColors();

        document.addEventListener('themechange', applyPillColors);

        const media = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
        if (media) {
            if (typeof media.addEventListener === 'function') {
                media.addEventListener('change', applyPillColors);
            } else if (typeof media.addListener === 'function') {
                media.addListener(applyPillColors);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }

    function initInsightsPage() {
        const data = getParticipationData();
        if (!data || !Array.isArray(data.threads)) {
            console.error('Insights data not loaded (participationData missing).');
            renderDataLoadError();
            return;
        }

        const threads = data.threads;
        updateStats(threads, data.total_count);
        renderHomeworkBreakdown(threads);
        renderProviderBreakdown(threads);

        const themeAnalysis = analyzeThemes(threads);
        renderCommonThemes(themeAnalysis);
        renderLlmAnalysis(themeAnalysis);
    }

    function renderDataLoadError() {
        const hwBody = document.getElementById('hw-breakdown-body');
        if (hwBody) {
            hwBody.innerHTML = '<tr><td colspan="3">Unable to load `data.js`.</td></tr>';
        }

        const providerBody = document.getElementById('provider-breakdown-body');
        if (providerBody) {
            providerBody.innerHTML = '<tr><td colspan="4">Unable to load `data.js`.</td></tr>';
        }

        const llmGrid = document.getElementById('llm-analysis-grid');
        if (llmGrid) {
            llmGrid.innerHTML = '<div class="llm-detail-card"><p class="theme-meta">Unable to load `data.js`.</p></div>';
        }
    }

    function renderUnexpectedError() {
        const hwBody = document.getElementById('hw-breakdown-body');
        if (hwBody) {
            hwBody.innerHTML = '<tr><td colspan="3">Unable to render insights (see console).</td></tr>';
        }

        const providerBody = document.getElementById('provider-breakdown-body');
        if (providerBody) {
            providerBody.innerHTML = '<tr><td colspan="4">Unable to render insights (see console).</td></tr>';
        }

        const strengths = document.getElementById('common-strengths');
        if (strengths) strengths.innerHTML = '<li>Unable to render insights (see console).</li>';

        const weaknesses = document.getElementById('common-weaknesses');
        if (weaknesses) weaknesses.innerHTML = '<li>Unable to render insights (see console).</li>';

        const llmGrid = document.getElementById('llm-analysis-grid');
        if (llmGrid) {
            llmGrid.innerHTML = '<div class="llm-detail-card"><p class="theme-meta">Unable to render insights (see console).</p></div>';
        }
    }

    function getParticipationData() {
        if (window.participationData && Array.isArray(window.participationData.threads)) return window.participationData;
        if (typeof participationData !== 'undefined') return participationData;
        return null;
    }

    function updateStats(threads, totalCount) {
        const total = Number.isFinite(totalCount) ? totalCount : threads.length;
        const authors = new Set(threads.map(t => t.author).filter(Boolean)).size;
        const llms = new Set(threads.map(t => t.llm_used).filter(Boolean)).size;
        const providers = new Set(threads.map(t => t.provider).filter(Boolean)).size;

        setText('stat-submissions', total);
        setText('stat-authors', authors);
        setText('stat-llms', llms);
        setText('stat-providers', providers);
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = String(value);
    }

    function renderHomeworkBreakdown(threads) {
        const tbody = document.getElementById('hw-breakdown-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const hwCounts = new Map();
        const hwLlmCounts = new Map();

        threads.forEach(thread => {
            const hw = (thread.homework || 'Unknown HW').trim();
            const llm = (thread.llm_used || 'Unknown').trim();

            hwCounts.set(hw, (hwCounts.get(hw) || 0) + 1);

            if (!hwLlmCounts.has(hw)) hwLlmCounts.set(hw, new Map());
            const modelCounts = hwLlmCounts.get(hw);
            modelCounts.set(llm, (modelCounts.get(llm) || 0) + 1);
        });

        const sortedHw = [...hwCounts.entries()]
            .sort((a, b) => hwSortKey(a[0]) - hwSortKey(b[0]));

        sortedHw.forEach(([hw, count]) => {
            const row = document.createElement('tr');

            const hwCell = document.createElement('td');
            const hwStrong = document.createElement('strong');
            hwStrong.textContent = hw;
            hwCell.appendChild(hwStrong);

            const countCell = document.createElement('td');
            countCell.textContent = String(count);

            const topCell = document.createElement('td');
            const modelCounts = hwLlmCounts.get(hw) || new Map();
            const topModels = [...modelCounts.entries()]
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, 3);

            topModels.forEach(([model, modelCount]) => {
                const badge = document.createElement('span');
                badge.className = 'llm-badge';
                badge.textContent = `${model} (${modelCount})`;
                topCell.appendChild(badge);
            });

            row.appendChild(hwCell);
            row.appendChild(countCell);
            row.appendChild(topCell);
            tbody.appendChild(row);
        });
    }

    function renderProviderBreakdown(threads) {
        const tbody = document.getElementById('provider-breakdown-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const total = threads.length;
        const providerCounts = new Map();
        const providerModelCounts = new Map();

        threads.forEach(thread => {
            const provider = (thread.provider || 'Unknown').trim();
            const model = (thread.llm_used || 'Unknown').trim();

            providerCounts.set(provider, (providerCounts.get(provider) || 0) + 1);
            if (!providerModelCounts.has(provider)) providerModelCounts.set(provider, new Map());
            const modelCounts = providerModelCounts.get(provider);
            modelCounts.set(model, (modelCounts.get(model) || 0) + 1);
        });

        const sortedProviders = [...providerCounts.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

        sortedProviders.forEach(([provider, count]) => {
            const row = document.createElement('tr');

            const providerCell = document.createElement('td');
            const providerBadge = document.createElement('span');
            providerBadge.className = 'provider-badge';
            providerBadge.textContent = provider;
            providerCell.appendChild(providerBadge);

            const countCell = document.createElement('td');
            countCell.textContent = String(count);

            const shareCell = document.createElement('td');
            const share = total > 0 ? (count / total) * 100 : 0;
            shareCell.textContent = `${share.toFixed(1)}%`;

            const modelsCell = document.createElement('td');
            const modelCounts = providerModelCounts.get(provider) || new Map();
            const modelsSorted = [...modelCounts.entries()]
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, 8)
                .map(([model, modelCount]) => `${model} (${modelCount})`);
            modelsCell.textContent = modelsSorted.join(', ');

            row.appendChild(providerCell);
            row.appendChild(countCell);
            row.appendChild(shareCell);
            row.appendChild(modelsCell);
            tbody.appendChild(row);
        });
    }

    function analyzeThemes(threads) {
        const llmTotals = new Map();
        const allLlms = new Set(threads.map(t => (t.llm_used || 'Unknown').trim()));

        const overall = {
            strengths: new Map(),
            weaknesses: new Map(),
        };

        const byLlm = new Map();

        function bump(map, themeLabel, llmName) {
            if (!map.has(themeLabel)) {
                map.set(themeLabel, { count: 0, llms: new Set() });
            }
            const entry = map.get(themeLabel);
            entry.count += 1;
            entry.llms.add(llmName);
        }

        threads.forEach(thread => {
            const llm = (thread.llm_used || 'Unknown').trim();
            llmTotals.set(llm, (llmTotals.get(llm) || 0) + 1);

            const text = `${thread.title || ''}\n${thread.content || ''}`;
            const strengths = detectThemes(text, THEME_DEFINITIONS.strengths);
            const weaknesses = detectThemes(text, THEME_DEFINITIONS.weaknesses);

            strengths.forEach(label => bump(overall.strengths, label, llm));
            weaknesses.forEach(label => bump(overall.weaknesses, label, llm));

            if (!byLlm.has(llm)) {
                byLlm.set(llm, {
                    total: 0,
                    strengths: new Map(),
                    weaknesses: new Map(),
                });
            }
            const record = byLlm.get(llm);
            record.total += 1;
            strengths.forEach(label => record.strengths.set(label, (record.strengths.get(label) || 0) + 1));
            weaknesses.forEach(label => record.weaknesses.set(label, (record.weaknesses.get(label) || 0) + 1));
        });

        return {
            totalSubmissions: threads.length,
            totalLlms: allLlms.size,
            overall,
            byLlm,
        };
    }

    function detectThemes(text, themeDefs) {
        const hits = [];
        themeDefs.forEach(theme => {
            if (matchesTheme(text, theme)) hits.push(theme.label);
        });
        return hits;
    }

    function matchesTheme(text, theme) {
        if (!text) return false;
        const patterns = Array.isArray(theme.patterns) ? theme.patterns : [];
        const negatives = Array.isArray(theme.negative) ? theme.negative : [];

        const hasPositive = patterns.some(re => re.test(text));
        if (!hasPositive) return false;

        if (negatives.some(re => re.test(text))) return false;
        return true;
    }

    function renderCommonThemes(themeAnalysis) {
        const strengthsEl = document.getElementById('common-strengths');
        const weaknessesEl = document.getElementById('common-weaknesses');
        if (!strengthsEl || !weaknessesEl) return;

        strengthsEl.innerHTML = '';
        weaknessesEl.innerHTML = '';

        const topStrengths = sortedThemeEntries(themeAnalysis.overall.strengths).slice(0, 6);
        const topWeaknesses = sortedThemeEntries(themeAnalysis.overall.weaknesses).slice(0, 6);

        topStrengths.forEach(([label, entry]) => {
            strengthsEl.appendChild(renderThemeListItem(label, entry, themeAnalysis));
        });

        topWeaknesses.forEach(([label, entry]) => {
            weaknessesEl.appendChild(renderThemeListItem(label, entry, themeAnalysis));
        });
    }

    function renderThemeListItem(label, entry, themeAnalysis) {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        strong.textContent = label;
        li.appendChild(strong);

        const pct = themeAnalysis.totalSubmissions > 0
            ? (entry.count / themeAnalysis.totalSubmissions) * 100
            : 0;
        const coverage = entry.llms ? entry.llms.size : 0;

        const meta = document.createTextNode(
            ` — ${entry.count} submissions (${pct.toFixed(0)}%), ${coverage}/${themeAnalysis.totalLlms} models`
        );
        li.appendChild(meta);
        return li;
    }

    function renderLlmAnalysis(themeAnalysis) {
        const grid = document.getElementById('llm-analysis-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const topLlms = [...themeAnalysis.byLlm.entries()]
            .sort((a, b) => b[1].total - a[1].total || a[0].localeCompare(b[0]))
            .slice(0, 10);

        topLlms.forEach(([llm, record]) => {
            const card = document.createElement('div');
            card.className = 'llm-detail-card';

            const h4 = document.createElement('h4');
            h4.textContent = llm + ' ';
            const count = document.createElement('span');
            count.className = 'count';
            count.textContent = `${record.total} submissions`;
            h4.appendChild(count);
            card.appendChild(h4);

            const p = document.createElement('p');
            p.className = 'theme-meta';
            p.textContent = 'Most mentioned themes in student writeups for this model.';
            card.appendChild(p);

            const themesBlock = document.createElement('div');
            themesBlock.className = 'strengths';

            const strengthsRow = document.createElement('div');
            const strengthsLabel = document.createElement('strong');
            strengthsLabel.style.color = '#4ade80';
            strengthsLabel.textContent = 'Strengths: ';
            strengthsRow.appendChild(strengthsLabel);
            appendThemeBadges(strengthsRow, record.strengths, record.total, 'strength');

            const weaknessesRow = document.createElement('div');
            weaknessesRow.style.marginTop = '0.5rem';
            const weaknessesLabel = document.createElement('strong');
            weaknessesLabel.style.color = '#f87171';
            weaknessesLabel.textContent = 'Weaknesses: ';
            weaknessesRow.appendChild(weaknessesLabel);
            appendThemeBadges(weaknessesRow, record.weaknesses, record.total, 'weakness');

            themesBlock.appendChild(strengthsRow);
            themesBlock.appendChild(weaknessesRow);
            card.appendChild(themesBlock);

            grid.appendChild(card);
        });
    }

    function appendThemeBadges(container, themeCounts, total, kind) {
        const top = sortedThemeEntries(themeCounts).slice(0, 3);
        if (top.length === 0) {
            const em = document.createElement('span');
            em.className = 'theme-meta';
            em.textContent = 'None detected';
            container.appendChild(em);
            return;
        }

        top.forEach(([label, entry]) => {
            const count = typeof entry === 'number' ? entry : entry.count;
            const badge = document.createElement('span');
            badge.className = `theme-badge ${kind}`;
            const pct = total > 0 ? (count / total) * 100 : 0;
            badge.textContent = `${label} (${pct.toFixed(0)}%)`;
            container.appendChild(badge);
        });
    }

    function sortedThemeEntries(mapOrObj) {
        const entries = mapOrObj instanceof Map
            ? [...mapOrObj.entries()]
            : Object.entries(mapOrObj || {});

        return entries.sort((a, b) => {
            const countA = typeof a[1] === 'number' ? a[1] : a[1].count;
            const countB = typeof b[1] === 'number' ? b[1] : b[1].count;
            return countB - countA || a[0].localeCompare(b[0]);
        });
    }

    function hwSortKey(hw) {
        const match = /(\d+)/.exec(hw);
        return match ? Number(match[1]) : 999;
    }

    function applyPillColors() {
        const isDark = isDarkMode();

        // Provider badges (Provider Market Share)
        document.querySelectorAll('.provider-badge').forEach(el => {
            const providerName = extractLabel(el.textContent);
            const rgb = getProviderRgb(providerName);
            applyRgbToPill(el, rgb, { isDark });
        });

        // LLM badges (Homework Submission Breakdown)
        document.querySelectorAll('.llm-badge').forEach(el => {
            const modelName = extractLabel(el.textContent);
            const rgb = getModelRgb(modelName);
            applyRgbToPill(el, rgb, { isDark });
        });

        // Strength tags (LLM Performance Analysis): color by the model's provider/model color.
        document.querySelectorAll('.llm-detail-card').forEach(card => {
            const modelName = getCardModelName(card);
            const rgb = getModelRgb(modelName);

            card.querySelectorAll('.tag').forEach(tagEl => {
                applyRgbToPill(tagEl, rgb, { isDark });
            });

            const countEl = card.querySelector('.count');
            if (countEl && rgb) {
                const rgbCsv = rgbToCssRgb(rgb);
                countEl.style.background = rgbCsv;
                countEl.style.color = getReadableTextColor(rgbCsv);
            }
        });
    }

    function getProviderRgb(providerName) {
        const provider = (providerName || '').trim();
        if (!provider) return FALLBACK_PROVIDER_RGB.Unknown;

        const palette = window.INSIGHTS_PALETTE && window.INSIGHTS_PALETTE.providers
            ? window.INSIGHTS_PALETTE
            : null;

        if (palette && palette.providers && palette.providers[provider]) {
            return palette.providers[provider];
        }

        return FALLBACK_PROVIDER_RGB[provider] || FALLBACK_PROVIDER_RGB.Unknown;
    }

    function applyRgbToPill(el, rgb, { isDark }) {
        if (!rgb) return;
        const parsed = parseRgb(rgb);
        if (!parsed) return;

        const [r, g, b] = parsed;
        const bgAlpha = readCssNumber('--pill-alpha-bg', isDark ? 0.22 : 0.12);
        const borderAlpha = readCssNumber('--pill-alpha-border', isDark ? 0.35 : 0.25);

        const fg = isDark ? `rgb(${r}, ${g}, ${b})` : '#0f172a';

        // Modern path (CSS vars) + hardened path for older browsers.
        el.style.setProperty('--pill-rgb', `${r} ${g} ${b}`);
        el.style.setProperty('--pill-fg', fg);

        el.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${bgAlpha})`;
        el.style.borderColor = `rgba(${r}, ${g}, ${b}, ${borderAlpha})`;
        el.style.color = fg;
    }

    function isDarkMode() {
        const forced = document.documentElement && document.documentElement.dataset
            ? document.documentElement.dataset.theme
            : null;

        if (forced === 'dark') return true;
        if (forced === 'light') return false;

        return Boolean(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    function extractLabel(text) {
        if (!text) return '';
        // Strip trailing counts like " (3)" from LLM badges.
        return text.replace(/\s*\(\d+.*\)\s*$/, '').trim();
    }

    function getCardModelName(card) {
        const heading = card.querySelector('h4');
        if (!heading) return '';

        const clone = heading.cloneNode(true);
        const count = clone.querySelector('.count');
        if (count) count.remove();
        return clone.textContent.trim();
    }

    function getModelRgb(modelName) {
        const normalized = normalizeKey(modelName);
        if (!normalized) return null;

        const palette = window.INSIGHTS_PALETTE && window.INSIGHTS_PALETTE.llms
            ? window.INSIGHTS_PALETTE
            : null;

        if (palette && palette.llms && palette.llms[normalized] && palette.llms[normalized].rgb) {
            return palette.llms[normalized].rgb;
        }

        const provider = inferProvider(modelName);
        const providerRgb = (palette && palette.providers && palette.providers[provider])
            ? palette.providers[provider]
            : (FALLBACK_PROVIDER_RGB[provider] || FALLBACK_PROVIDER_RGB.Unknown);

        return variantRgb(providerRgb, modelName);
    }

    function normalizeKey(text) {
        return (text || '').trim().toLowerCase();
    }

    function inferProvider(modelName) {
        const name = normalizeKey(modelName);
        if (!name) return 'Unknown';

        if (name.includes('gpt') || name.includes('chatgpt') || name.includes('o1') || name.includes('o3')) return 'OpenAI';
        if (name.includes('claude')) return 'Anthropic';
        if (name.includes('gemini') || name.includes('gemma')) return 'Google';
        if (name.includes('deepseek')) return 'DeepSeek';
        if (name.includes('mistral')) return 'Mistral AI';
        if (name.includes('grok')) return 'xAI';
        if (name.includes('qwen')) return 'Alibaba';
        if (name.includes('kimi')) return 'Moonshot AI';
        if (name.includes('perplexity')) return 'Perplexity';
        if (name.includes('llama')) return 'Meta';

        return 'Other';
    }

    function variantRgb(baseRgb, modelName) {
        const base = parseRgb(baseRgb);
        if (!base) return null;

        const variant = MODEL_VARIANTS[hashString(normalizeKey(modelName)) % MODEL_VARIANTS.length];
        if (variant === 0) return `${base[0]} ${base[1]} ${base[2]}`;

        const mix = variant > 0 ? [255, 255, 255] : [0, 0, 0];
        const t = Math.abs(variant);
        const out = [
            Math.round(base[0] * (1 - t) + mix[0] * t),
            Math.round(base[1] * (1 - t) + mix[1] * t),
            Math.round(base[2] * (1 - t) + mix[2] * t),
        ];

        return `${out[0]} ${out[1]} ${out[2]}`;
    }

    function parseRgb(rgb) {
        if (!rgb) return null;
        const parts = String(rgb).trim().split(/\s+/).slice(0, 3).map(n => Number.parseInt(n, 10));
        if (parts.length !== 3 || parts.some(n => !Number.isFinite(n))) return null;
        return parts;
    }

    function readCssNumber(name, fallback) {
        try {
            const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
            const value = Number.parseFloat(String(raw).trim());
            return Number.isFinite(value) ? value : fallback;
        } catch {
            return fallback;
        }
    }

    function rgbToCssRgb(rgb) {
        return `rgb(${String(rgb).trim().split(/\s+/).slice(0, 3).join(', ')})`;
    }

    function getReadableTextColor(cssRgb) {
        const match = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(cssRgb);
        if (!match) return '#ffffff';
        const r = Number(match[1]) / 255;
        const g = Number(match[2]) / 255;
        const b = Number(match[3]) / 255;
        const luminance = relativeLuminance([r, g, b]);
        return luminance > 0.6 ? '#0f172a' : '#ffffff';
    }

    function relativeLuminance([r, g, b]) {
        const R = srgbToLinear(r);
        const G = srgbToLinear(g);
        const B = srgbToLinear(b);
        return 0.2126 * R + 0.7152 * G + 0.0722 * B;
    }

    function srgbToLinear(c) {
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }

    function hashString(str) {
        // FNV-1a 32-bit hash
        let hash = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            hash ^= str.charCodeAt(i);
            hash = Math.imul(hash, 0x01000193);
        }
        return hash >>> 0;
    }
})();
