import {
    appendFileSync,
    existsSync,
    mkdirSync,
    readFileSync,
    writeFileSync,
} from 'node:fs';
import path from 'node:path';

const summaryPath = process.env.GITHUB_STEP_SUMMARY;
const playwrightReportPath = process.env.PLAYWRIGHT_JSON_OUTPUT_FILE;

if (!summaryPath) {
    throw new Error('GITHUB_STEP_SUMMARY is not configured.');
}

if (!playwrightReportPath) {
    throw new Error('PLAYWRIGHT_JSON_OUTPUT_FILE is not configured.');
}

const resultsDirectory = process.argv[2] ?? 'test-results';
const recoveryStatuses = new Set([
    'NORMAL_PASS',
    'HEALED_PASS',
    'HEALING_FAILED',
    'HEALING_UNAVAILABLE',
]);
const testResults = [];
const reportAvailable = existsSync(playwrightReportPath);
const playwrightReport = reportAvailable
    ? JSON.parse(readFileSync(playwrightReportPath, 'utf8'))
    : undefined;

function readHealingRecords(result) {
    return (result.attachments ?? [])
        .filter((attachment) =>
            attachment.contentType === 'application/json' &&
            /^nexus-self-healing-.+\.json$/.test(attachment.name),
        )
        .map((attachment) => {
            if (typeof attachment.body !== 'string') {
                throw new Error(
                    `Healing attachment has no embedded body: ${attachment.name}`,
                );
            }

            const record = JSON.parse(
                Buffer.from(attachment.body, 'base64').toString('utf8'),
            );

            if (!recoveryStatuses.has(record.status)) {
                throw new Error(
                    `Unexpected self-healing status in ${attachment.name}`,
                );
            }

            return record;
        });
}

function getTestStatus(spec, test) {
    const lastAttempt = test.results?.at(-1);

    if (test.status === 'skipped' || lastAttempt?.status === 'skipped') {
        return 'skipped';
    }

    if (test.status === 'flaky') {
        return 'flaky';
    }

    return spec.ok ? 'passed' : 'failed';
}

function visitSuite(suite, parentTitlePath = []) {
    const titlePath = suite.title
        ? [...parentTitlePath, suite.title]
        : parentTitlePath;

    for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
            const attempts = (test.results ?? []).map((result) => ({
                retry: result.retry,
                status: result.status,
                durationMs: result.duration,
                errors: (result.errors ?? []).map((error) => ({
                    message: error.message,
                    location: error.location,
                })),
                healingActions: readHealingRecords(result),
                startTime: result.startTime,
            }));
            const startTime = attempts.find((attempt) => attempt.startTime)?.startTime;

            testResults.push({
                title: spec.title,
                titlePath: [...titlePath, spec.title],
                file: spec.file ?? suite.file,
                project: test.projectName,
                status: getTestStatus(spec, test),
                outcome: test.status,
                expectedStatus: test.expectedStatus,
                startTime,
                attempts,
            });
        }
    }

    for (const childSuite of suite.suites ?? []) {
        visitSuite(childSuite, titlePath);
    }
}

for (const suite of playwrightReport?.suites ?? []) {
    visitSuite(suite);
}

testResults.sort((left, right) => {
    const leftTime = left.startTime ? Date.parse(left.startTime) : Number.MAX_SAFE_INTEGER;
    const rightTime = right.startTime ? Date.parse(right.startTime) : Number.MAX_SAFE_INTEGER;

    return leftTime - rightTime;
});

const testOutcomes = {
    total: testResults.length,
    passed: testResults.filter((test) => test.status === 'passed').length,
    failed: testResults.filter((test) => test.status === 'failed').length,
    flaky: testResults.filter((test) => test.status === 'flaky').length,
    skipped: testResults.filter((test) => test.status === 'skipped').length,
};
const healingActions = [];

for (const [testIndex, test] of testResults.entries()) {
    test.order = testIndex + 1;
    delete test.startTime;

    for (const attempt of test.attempts) {
        delete attempt.startTime;

        for (const action of attempt.healingActions) {
            action.order = healingActions.length + 1;
            action.playwrightStatus = test.status;
            action.testTitlePath = test.titlePath;
            healingActions.push(action);
        }
    }
}

const recoveryActions = healingActions.filter(
    (action) => action.status !== 'NORMAL_PASS',
);
const healingOutcomes = {
    normalPass: healingActions.filter((action) => action.status === 'NORMAL_PASS').length,
    recoveryOutcomes: recoveryActions.length,
    healed: recoveryActions.filter((action) => action.status === 'HEALED_PASS').length,
    notHealed: recoveryActions.filter((action) => action.status === 'HEALING_FAILED').length,
    unavailable: recoveryActions.filter((action) => action.status === 'HEALING_UNAVAILABLE').length,
};
const output = {
    generatedAt: new Date().toISOString(),
    playwrightReportAvailable: reportAvailable,
    summary: {
        tests: testOutcomes,
        selfHealing: healingOutcomes,
    },
    tests: testResults,
    ...(playwrightReport?.errors?.length
        ? { runnerErrors: playwrightReport.errors }
        : {}),
};

mkdirSync(resultsDirectory, { recursive: true });
writeFileSync(
    path.join(resultsDirectory, 'self-healing-summary.json'),
    `${JSON.stringify(output, null, 2)}\n`,
    'utf8',
);

const lines = [];
const code = (value) =>
    `\`${String(value).replace(/\r?\n/g, ' ').replace(/`/g, '\\`')}\``;

if (!reportAvailable) {
    lines.push(
        '### Live AI self-healing summary',
        '',
        '- Playwright did not produce a JSON test report; check the test or setup step.',
        '- Details: see `test-results/self-healing-summary.json` in the artifact.',
        '',
    );
} else if (recoveryActions.length === 1) {
    const action = recoveryActions[0];
    const outcome = action.status === 'HEALED_PASS'
        ? 'AI recovery succeeded; the validated replacement action succeeded.'
        : action.status === 'HEALING_FAILED'
            ? 'Recovery was attempted but did not complete successfully.'
            : 'Recovery was unavailable; the original failure was preserved.';
    const openAIDetails = action.openAI
        ? [
            action.openAI.model ? `model=${action.openAI.model}` : undefined,
            action.openAI.httpStatus !== undefined
                ? `http=${action.openAI.httpStatus}`
                : undefined,
            action.openAI.responseStatus
                ? `response=${action.openAI.responseStatus}`
                : undefined,
            action.openAI.incompleteReason
                ? `incomplete=${action.openAI.incompleteReason}`
                : undefined,
            action.openAI.errorCode
                ? `error=${action.openAI.errorCode}`
                : undefined,
            action.openAI.requestDurationMs !== undefined
                ? `request_ms=${action.openAI.requestDurationMs}`
                : undefined,
        ].filter((item) => item !== undefined).join(', ')
        : 'not called';

    lines.push(
        `### Self-healing result: ${action.status}`,
        '',
        `- Test: ${code(action.testTitlePath.join(' > '))}`,
        `- Test result: ${action.playwrightStatus}`,
        `- Outcome: ${outcome}`,
        `- Original locator: ${code(action.originalLocator)}`,
        `- Proposed locator: ${action.proposedLocator ? code(action.proposedLocator) : 'none'}`,
        `- Replacement used: ${action.replacementLocator ? code(action.replacementLocator) : 'none'}`,
        `- Failure stage: ${action.failureStage ?? 'none'}`,
        `- Details: ${action.validationReason ? code(action.validationReason) : 'none'}`,
        `- OpenAI: ${code(openAIDetails)}`,
        `- Full ordered report: ${code('test-results/self-healing-summary.json')}`,
        '',
    );
} else {
    lines.push(
        '### Live AI self-healing summary',
        '',
        `- Test results: ${testOutcomes.passed} passed, ${testOutcomes.failed} failed, ${testOutcomes.flaky} flaky, ${testOutcomes.skipped} skipped`,
        `- Recovery outcomes: ${healingOutcomes.recoveryOutcomes}`,
        `- Healed: ${healingOutcomes.healed}`,
        `- Not healed: ${healingOutcomes.notHealed}`,
        `- Unavailable: ${healingOutcomes.unavailable}`,
        `- Full ordered report: ${code('test-results/self-healing-summary.json')} in the artifact.`,
        '',
    );
}

appendFileSync(summaryPath, `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
