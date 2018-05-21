const assert = require('assert');
const path = require('path');
const { TurnContext, TestAdapter } = require('botbuilder');
const { createAttachmentPrompt } = require('../lib');
const TranscriptUtilities = require('../../botbuilder-core-extensions/tests/transcriptUtilities');

// Helper for running a TestFlow against a .transcript file
const getFillTranscriptPath = (file) => path.join('../../transcripts', file);
function testWithTranscript(transcriptPath, logic) {
    return TranscriptUtilities.getActivitiesFromTranscript(getFillTranscriptPath(transcriptPath)).then(activities => {
        return new Promise((resolve, reject) => {
            var adapter = new TestAdapter(logic);
            adapter.testActivities(activities)
                .then(resolve)
                .catch(reject);
        });
    });
}

class TestContext extends TurnContext {
    constructor(request) {
        super(new TestAdapter(), request);
        this.sent = undefined;
        this.onSendActivities((context, activities, next) => {
            this.sent = activities;
        });
    }
}

describe('AttachmentPrompt', function () {
    this.timeout(5000);

    it('should create prompt.', function () {
        const prompt = createAttachmentPrompt();
        assert(prompt, `Prompt not created.`);
        assert(prompt.prompt, `Prompt.prompt() not found.`);
        assert(prompt.recognize, `Prompt.recognize() not found.`);
    });

    it('should send prompt().', async function () {
        await testWithTranscript('AttachmentPromptTests/AttachmentPrompt_ShouldSendPrompt.transcript',
            context => {
                const prompt = createAttachmentPrompt();
                return prompt.prompt(context, `please add an attachment.`)
            });
    });

    it('should recognize() a attachment.', async function () {
        var inPrompt = false;
        await testWithTranscript('AttachmentPromptTests/AttachmentPrompt_ShouldRecognizeAttachment.transcript',
            context => {
                const prompt = createAttachmentPrompt();
                if (!inPrompt) {
                    inPrompt = true;
                    return prompt.prompt(context, `please add an attachment.`)
                } else {
                    return prompt.recognize(context).then(result => {
                        if (result.length === 1) {
                            var reply = result[0].content;
                            return context.sendActivity(reply);
                        } else {
                            return context.sendActivity("invalid");
                        }
                    });
                }
            });
    });

    it('should NOT recognize() other text.', function (done) {
        const context = new TestContext({ text: `what was that?`, type: 'message' });
        const prompt = createAttachmentPrompt();
        prompt.recognize(context).then((values) => {
            assert(values === undefined, `shouldn't have recognized.`);
            done();
        });
    });

    it('should call custom validator.', function (done) {
        let called = false;
        const context = new TestContext({ attachments: [{ contentType: 'foo' }], type: 'message' });
        const prompt = createAttachmentPrompt((context, values) => {
            assert(Array.isArray(values), `values not an array.`);
            assert(values.length === 1, `reply not recognized.`);
            called = true;
            return undefined;
        });
        prompt.recognize(context).then((values) => {
            assert(called, `custom validator not called.`);
            assert(values === undefined, `invalid values returned.`);
            done();
        });
    });

    it('should handle an undefined request.', function (done) {
        let called = false;
        const context = new TestContext(undefined);
        const prompt = createAttachmentPrompt((context, values) => {
            assert(values === undefined, `value shouldn't have been recognized.`);
            called = true;
            return undefined;
        });
        prompt.recognize(context).then((values) => {
            assert(called, `custom validator not called.`);
            assert(values === undefined, `invalid values returned.`);
            done();
        });
    });
});
