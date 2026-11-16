import {
    appendFileSync,
    existsSync,
    readdirSync,
    readFileSync,
} from 'node:fs';
import path from 'node:path';

const summaryPath = process.env.GITHUB_STEP_SUMMARY;

if (!summaryPath) {
    throw new Error('GITHUB_STEP_SUMMARY is not configured.');
}

const resultsDirectory = process.argv[2] ?? 'test-results';
const recoveryStatuses = new Set([
    'NORMAL_PASS',
    'HEALED_PASS',
    'HEALING_FAILED',
    'HEALING_UNAVAILABLE',
]);
const records = [];

function collectRecords(directory) {
    if (!existsSync(directory)) {
        return;
    }

    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory() && entry.name !== 'attachments') {
            collectRecords(entryPath);
        } else if (
            entry.isFile() &&
            /^nexus-self-healing-.+\.json$/.test(entry.name)
        ) {
            const record = JSON.parse(readFileSync(entryPath, 'utf8'));

            if (!recoveryStatuses.has(record.status)) {
                throw new Error(`Unexpected self-healing status in ${entryPath}`);
            }

            if (record.status !== 'NORMAL_PASS') {
                records.push(record);
            }
        }
    }
}

collectRecords(resultsDirectory);

const healed = records.filter((record) => record.status === 'HEALED_PASS').length;
const failed = records.filter((record) => record.status === 'HEALING_FAILED').length;
const unavailable = records.filter((record) => record.status === 'HEALING_UNAVAILABLE').length;
const lines = [];
const code = (value) =>
    `\`${String(value).replace(/\r?\n/g, ' ').replace(/`/g, '\\`')}\``;

if (records.length === 1) {
    const record = records[0];
    const outcome = record.status === 'HEALED_PASS'
        ? 'AI recovery succeeded; the validated replacement action succeeded.'
        : record.status === 'HEALING_FAILED'
            ? 'Recovery was attempted but did not complete successfully.'
            : 'Recovery was unavailable; the original failure was preserved.';
    const openAIDetails = record.openAI
        ? [
            record.openAI.model ? `model=${record.openAI.model}` : undefined,
            record.openAI.httpStatus !== undefined
                ? `http=${record.openAI.httpStatus}`
                : undefined,
            record.openAI.responseStatus
                ? `response=${record.openAI.responseStatus}`
                : undefined,
            record.openAI.incompleteReason
                ? `incomplete=${record.openAI.incompleteReason}`
                : undefined,
            record.openAI.errorCode
                ? `error=${record.openAI.errorCode}`
                : undefined,
            record.openAI.requestDurationMs !== undefined
                ? `request_ms=${record.openAI.requestDurationMs}`
                : undefined,
        ].filter((item) => item !== undefined).join(', ')
        : 'not called';

    lines.push(
        `### Self-healing result: ${record.status}`,
        '',
        `- Test: ${code((record.test?.titlePath ?? []).join(' > '))}`,
        `- Outcome: ${outcome}`,
        `- Original locator: ${code(record.originalLocator)}`,
        `- Proposed locator: ${record.proposedLocator ? code(record.proposedLocator) : 'none'}`,
        `- Replacement used: ${record.replacementLocator ? code(record.replacementLocator) : 'none'}`,
        `- Failure stage: ${record.failureStage ?? 'none'}`,
        `- Details: ${record.validationReason ? code(record.validationReason) : 'none'}`,
        `- OpenAI: ${code(openAIDetails)}`,
        '',
    );
} else {
    lines.push(
        '### Live AI self-healing summary',
        '',
        `- Recovery outcomes: ${records.length}`,
        `- Healed: ${healed}`,
        `- Not healed: ${failed}`,
        `- Unavailable: ${unavailable}`,
        '- Per-attempt details: see the live AI Playwright report artifact.',
        '',
    );
}

appendFileSync(summaryPath, `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
