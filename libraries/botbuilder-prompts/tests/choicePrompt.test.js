const assert = require('assert');
const path = require('path');
const { TurnContext, TestAdapter } = require('botbuilder');
const { createChoicePrompt, ListStyle } = require('../lib');
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

const colorChoices = ['red', 'green', 'blue'];

describe('ChoicePrompt', function () {
    this.timeout(5000);

    it('should create prompt.', function () {
        const prompt = createChoicePrompt();
        assert(prompt, `Prompt not created.`);
        assert(prompt.prompt, `Prompt.prompt() not found.`);
        assert(prompt.recognize, `Prompt.recognize() not found.`);
    });

    it('should send prompt().', async function () {
        await testWithTranscript('ChoicePromptTests/ShouldSendPrompt.transcript',
            context => {
                const prompt = createChoicePrompt();
                prompt.style = ListStyle.none;
                return prompt.prompt(context, colorChoices, `favorite color?`)
            });
    });

    it('should send prompt() as an inline list.', async function () {
        await testWithTranscript('ChoicePromptTests/ShouldSendPromptAsAnInlineList.transcript',
            context => {
                const prompt = createChoicePrompt();
                prompt.style = ListStyle.inline;
                return prompt.prompt(context, colorChoices, `favorite color?`)
            });
    });

    it('should send prompt() as a numbered list.', async function () {
        await testWithTranscript(
            'ChoicePromptTests/ShouldSendPromptAsANumberedList.transcript',
            context => {
                const prompt = createChoicePrompt();
                prompt.style = ListStyle.list;
                return prompt.prompt(context, colorChoices, `favorite color?`)
            });
    });

    it('should send prompt() using suggested actions.', async function () {
        await testWithTranscript(
            'ChoicePromptTests/ShouldSendPromptUsingSuggestedActions.transcript',
            context => {
                const prompt = createChoicePrompt();
                prompt.style = ListStyle.suggestedAction;
                return prompt.prompt(context, colorChoices, `favorite color?`)
            });
    });

    it('should send prompt() without adding a list.', async function () {
        await testWithTranscript(
            'ChoicePromptTests/ShouldSendPromptWithoutAddingAList.transcript',
            context => {
                const prompt = createChoicePrompt();
                prompt.style = ListStyle.none;
                return prompt.prompt(context, colorChoices, `favorite color?`);
            });
    });

    it('should send prompt() without adding a list but adding ssml.', async function () {
        await testWithTranscript(
            'ChoicePromptTests/ShouldSendPromptWithoutAddingAListButAddingSsml.transcript',
            context => {
                const prompt = createChoicePrompt();
                prompt.style = ListStyle.none;
                prompt.prompt(context, colorChoices, `favorite color?`, `spoken prompt`)
            }
        )
    });

    it('should send activity based prompt().', async function () {
        await testWithTranscript(
            'ChoicePromptTests/ShouldSendActivityBasedPrompt.transcript',
            context => {
                const prompt = createChoicePrompt();
                return prompt.prompt(context, colorChoices, { text: 'test', type: 'message' });
            });
    });

    it('should send activity based prompt() with ssml.', async function () {
        await testWithTranscript(
            'ChoicePromptTests/ShouldSendActivityBasedPromptWithSsml.transcript',
            context => {
                const prompt = createChoicePrompt();
                return prompt.prompt(context, colorChoices, { text: 'test', type: 'message' }, 'spoken test');
            });
    });

    it('should recognize() a choice.', async function () {
        var inPrompt = false;
        await testWithTranscript(
            'ChoicePromptTests/ShouldRecognizeAChoice.transcript',
            context => {
                const prompt = createChoicePrompt();
                prompt.style = ListStyle.none;
                if (!inPrompt) {
                    inPrompt = true;
                    return prompt.prompt(context, colorChoices, 'favorite color?');
                } else {
                    return prompt.recognize(context, colorChoices)
                        .then(found => {
                            if (typeof found === 'object') {
                                return context.sendActivity(found.value)
                            } else {
                                return context.sendActivity("NotRecognized");
                            }
                        });
                }
            });
    });


    it('should NOT recognize() other text.', async function () {
        var inPrompt = false;
        await testWithTranscript(
            'ChoicePromptTests/ShouldNOTrecognizeOtherText.transcript',
            context => {
                const prompt = createChoicePrompt();
                prompt.style = ListStyle.none;
                if (!inPrompt) {
                    inPrompt = true;
                    return prompt.prompt(context, colorChoices, 'favorite color?');
                } else {
                    return prompt.recognize(context, colorChoices)
                        .then(found => {
                            if (typeof found === 'object') {
                                return context.sendActivity(found.value)
                            } else {
                                return context.sendActivity("NotRecognized");
                            }
                        });
                }
            });
    });

    it('should call custom validator.', async function () {
        var inPrompt = false;
        let called = false;
        await testWithTranscript(
            'ChoicePromptTests/ShouldCallCustomValidator.transcript',
            context => {
                const prompt = createChoicePrompt((context, found) => {
                    assert(typeof found === 'object', `reply not recognized.`);
                    called = true;
                    return undefined;
                });
                prompt.style = ListStyle.none;
                if (!inPrompt) {
                    inPrompt = true;
                    return prompt.prompt(context, colorChoices, 'favorite color?');
                } else {
                    return prompt.recognize(context, colorChoices)
                        .then(found => {
                            if (typeof found === 'object') {
                                return context.sendActivity(found.value)
                            } else {
                                return context.sendActivity("validation failed");
                            }
                        });
                }
            });

        assert(called, `custom validator not called.`);
    });

    it('should handle an undefined request.', async function () {
        var inPrompt = false;
        await testWithTranscript(
            'ChoicePromptTests/ShouldHandleAnUndefinedRequest.transcript',
            context => {
                const prompt = createChoicePrompt((context, found) => {
                    return;
                });
                prompt.style = ListStyle.none;
                if (!inPrompt) {
                    inPrompt = true;
                    return prompt.prompt(context, colorChoices, 'favorite color?');
                } else {
                    return prompt.recognize(context, colorChoices)
                        .then(found => {
                            if (typeof found === 'object') {
                                return context.sendActivity(found.value)
                            } else {
                                return context.sendActivity("NotRecognized");
                            }
                        });
                }
            });
    });
});
