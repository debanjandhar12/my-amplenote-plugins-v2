import {USER_PROMPT_LIST_SETTING} from "../constants.js";
import {getChatAppContext} from "./context/ChatAppContext.jsx";
import {capitalize} from "lodash-es";
import {replaceParagraphTextInMarkdown} from "../markdown/replaceParagraphTextInMarkdown.jsx";
import {ToolCategoryRegistry} from "./tools-core/registry/ToolCategoryRegistry.js";

export const ChatAppHeader = () => {
    // Fetch runtime and other assistant-ui contexts
    const runtime = AssistantUI.useAssistantRuntime();

    // New chat button functionality
    const onClickNewChat = React.useCallback(() => runtime.switchToNewThread(), [runtime]);

    const {Box, Tooltip, Button, Popover} = window.RadixUI;
    const {PlusIcon, MagicWandIcon} = window.RadixIcons;
    return (
        <Box style={{
            display: 'flex', justifyContent: 'flex-end', paddingRight: '4px',
            position: 'sticky', top: 0, zIndex: '1000', backgroundColor: 'var(--color-background)'
        }}>
            <Popover.Root>
                <Tooltip content="Prompt Library" style={{padding: '2px'}}>
                    <Popover.Trigger asChild>
                        <Button variant="ghost" size="1" style={{ margin: '2px', paddingTop: '5px'}} className={'user-prompt-library-button'}>
                                <MagicWandIcon width="13" height="13" />
                        </Button>
                    </Popover.Trigger>
                </Tooltip>
                <Popover.Content style={{width: '360px'}}>
                    <UserPromptLibrary />
                </Popover.Content>
            </Popover.Root>
            <ChatInterfaceMenu />
            <Tooltip content="New chat">
                <Button variant="ghost" size="1" style={{marginRight: '4px', margin: '2px'}}
                        onClick={onClickNewChat}>
                    <PlusIcon />
                </Button>
            </Tooltip>
        </Box>
    )
}

const ChatInterfaceMenu = () => {
    const threadRuntime = AssistantUI.useThreadRuntime();
    let [threadMessages, setThreadMessages] = React.useState([]);
    threadRuntime.subscribe(() => {
        setThreadMessages(threadRuntime.getState().messages || []);
    });
    const threadMessagesLength = threadMessages?.length;
    const threadId = AssistantUI.useThreadListItemRuntime().getState().id;
    const [exportNoteExists, setExportNoteExists] = React.useState(false);
    const [exportNoteName, setExportNoteName] = React.useState(`Copilot chat - ${threadId}`);

    // -- Init --
    React.useEffect(() => {
        setExportNoteName(`Copilot chat - ${threadId}`);
    }, [threadId]);
    React.useEffect(() => {
        (async () => {
            try {
                let note = await window.appConnector.findNote({name: exportNoteName});
                if (note) {
                    setExportNoteExists(true);
                } else {
                    setExportNoteExists(false);
                }
            } catch (e) {}
        })();
    }, [exportNoteName]);

    // -- Actions --
    const handleExportAsNote = React.useCallback(async () => {
        let noteContent = '';
        for (const message of threadMessages) {
            noteContent += `<mark style="color:undefined;">**${capitalize(message.role)}**<!-- {"cycleColor":"${
                message.role === 'assistant' ? '59' : '57'
            }"} --></mark>\n`;
            for (const contentPart of message.content) {
                if (contentPart.type === 'text') {
                    // Replace tool category mentions with code
                    let tempText = contentPart.text;
                    for (const categoryName of ToolCategoryRegistry.getAllCategoriesNames()) {
                        const toolCategory = ToolCategoryRegistry.getCategory(categoryName);
                        tempText = await replaceParagraphTextInMarkdown(tempText, (oldVal) => {
                            return oldVal.replaceAll('@' + categoryName, '`@' + toolCategory.name + '`');
                        });
                    }
                    // Trick to remove toolplan tags with toolPlanStartTag and toolPlanEndTag.
                    // This is done so <toolplan> doesn't get recognized as a markdown tag.
                    // Without this, replaceParagraphTextInMarkdown won't work.
                    tempText = tempText.replaceAll('<toolplan>', 'toolPlanStartTag').replaceAll('</toolplan>', 'toolPlanEndTag');
                    tempText = await replaceParagraphTextInMarkdown(tempText, (oldVal) => {
                        return oldVal.replace(/toolPlanStartTag(.*?)toolPlanEndTag/g, '');
                    });
                    tempText = tempText.replaceAll('toolPlanStartTag', '<toolplan>').replaceAll('toolPlanEndTag', '</toolplan>');

                    noteContent += tempText + '\n';
                } else if (contentPart.type === 'tool-call') {
                    noteContent += `«Tool call: ${contentPart.toolName}»\n`;
                }
            }
        }
        let note = await appConnector.findNote({name: exportNoteName});
        if (!note) {
            note = await appConnector.createNote(exportNoteName, []);
            note = await appConnector.findNote({name: exportNoteName});
            if (!note || !note.uuid) {
                throw new Error(`Failed to create note: ${exportNoteName}`);
            }
        }
        setExportNoteExists(true);
        await appConnector.replaceNoteContent({uuid: note.uuid}, noteContent);
        await appConnector.navigate(`https://www.amplenote.com/notes/${note.uuid}`);
        await appConnector.alert(`Chat exported to note: ${exportNoteName}`);
    }, [threadMessages, threadId, setExportNoteExists, exportNoteName]);
    const handleExportAsJSON = React.useCallback(async () => {
        const jsonContent = "data:text/json;charset=utf-8,"
            + encodeURIComponent(JSON.stringify(threadMessages, null, 2));
        await appConnector.saveFile({data: jsonContent, name: threadId + '.json'});
    }, [threadMessages, threadId, exportNoteName]);

    const {Flex, Text, Box, Popover, DropdownMenu, Button } = window.RadixUI;
    const {DropdownMenuIcon, CodeIcon, Share2Icon, FilePlusIcon, CounterClockwiseClockIcon} = window.RadixIcons;
    return (
        <Box>
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <Button variant="ghost" size="1" style={{ margin: '2px' }}>
                        <DropdownMenuIcon />
                    </Button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    <DropdownMenu.Item disabled title="Coming soon">
                        <CounterClockwiseClockIcon /> Chat History
                    </DropdownMenu.Item>
                    <DropdownMenu.Sub>
                        <DropdownMenu.SubTrigger disabled={threadMessagesLength === 0}>
                            <Share2Icon /> Export chat as
                        </DropdownMenu.SubTrigger>
                        <DropdownMenu.SubContent>
                            <DropdownMenu.Item onClick={handleExportAsNote}>
                                <Flex style={{ alignItems: 'center' }}>
                                    <FilePlusIcon />
                                    <Flex style={{ flexDirection: 'column', marginLeft: '8px' }}>
                                        <Flex style={{ alignItems: 'center' }}>
                                            {!exportNoteExists ? 'New Note' : 'Update Note'}
                                        </Flex>
                                        <Text size="1" style={{ color: 'var(--gray-11)'}}>
                                            {exportNoteName}
                                        </Text>
                                    </Flex>
                                </Flex>
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item onClick={handleExportAsJSON}>
                                <Flex style={{ alignItems: 'center' }}>
                                    <CodeIcon />
                                    <Text style={{ marginLeft: '8px' }}>Download JSON</Text>
                                </Flex>
                            </DropdownMenu.Item>
                        </DropdownMenu.SubContent>
                    </DropdownMenu.Sub>
                    {/*{*/}
                    {/*    threadMessagesLength > 0 &&*/}
                    {/*    <>*/}
                    {/*        <DropdownMenu.Separator />*/}
                    {/*        <DropdownMenu.Sub>*/}
                    {/*            <DropdownMenu.SubTrigger>*/}
                    {/*                <MagicWandIcon /> Prompt Library*/}
                    {/*            </DropdownMenu.SubTrigger>*/}
                    {/*            <DropdownMenu.SubContent style={{width: '360px'}}>*/}
                    {/*                <UserPromptLibrary />*/}
                    {/*            </DropdownMenu.SubContent>*/}
                    {/*        </DropdownMenu.Sub>*/}
                    {/*    </>*/}
                    {/*}*/}
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        </Box>
    );
};

const UserPromptLibrary = () => {
    const composer = AssistantUI.useComposerRuntime();
    const [userPromptList, setUserPromptList] = React.useState(null);
    const { threadNewMsgComposerRef } = React.useContext(getChatAppContext());

    React.useEffect(() => {
        (async () => {
            try {
                const settings = await window.appConnector.getSettings();
                setUserPromptList((JSON.parse(settings[USER_PROMPT_LIST_SETTING])).sort((a, b) => b.usageCount - a.usageCount));
            } catch (e) {
                setUserPromptList([]);
                console.error(e);
            }
        })();
    }, []);

    const handleInsertPrompt = React.useCallback((prompt) => {
        composer.setText(prompt.message);
        // composer.focus(); -> Removed from assistant-ui. They will bring it back in the future.
        threadNewMsgComposerRef.current.focus();
        const newPromptList = userPromptList.map(prompt2 => {
            if (prompt2.uuid === prompt.uuid) return { ...prompt, usageCount: prompt.usageCount + 1 };
            return prompt2;
        });
        setUserPromptList(newPromptList);
        window.appConnector.setSetting(USER_PROMPT_LIST_SETTING, JSON.stringify(newPromptList));
    }, [composer, userPromptList]);

    const handleAddPrompt = React.useCallback(async () => {
        const promptText = await window.appConnector.prompt("Enter prompt:", {
            inputs: [
                { label: "Enter custom prompt:", type: "text", value: '' }
            ]
        });
        if (!promptText) return;
        const promptObject = {
            uuid: Math.random().toString(36).substring(7),
            message: promptText.trim(),
            usageCount: 0
        };
        await window.appConnector.setSetting(USER_PROMPT_LIST_SETTING, JSON.stringify([...userPromptList, promptObject]));
        setUserPromptList([...userPromptList, promptObject]);
    }, [userPromptList]);

    const handleDeletePrompt = React.useCallback(async (e, prompt) => {
        e.stopPropagation();
        const deleteConfirmation = await window.appConnector.prompt("Are you sure you want to delete this prompt?", {
            inputs: [{
                label: "Yes, delete this prompt",
                type: "checkbox",
                value: true
            }]
        });
        if (!deleteConfirmation) return;
        await window.appConnector.setSetting(USER_PROMPT_LIST_SETTING, JSON.stringify(userPromptList.filter(p => p.uuid !== prompt.uuid)));
        setUserPromptList(userPromptList.filter(p => p.uuid !== prompt.uuid));
    }, [userPromptList]);

    if (!userPromptList) return null;

    const {Button, Tooltip, ScrollArea, Text, Box, Card, Flex, IconButton} = window.RadixUI;
    const { TrashIcon} = window.RadixIcons;
    return (
        <>
            <ScrollArea style={{ maxHeight: '320px' }} type={'auto'}>
                <Box style={{ padding: '8px' }}>
                    {userPromptList.map((prompt) => (
                        <Card asChild key={prompt.uuid} style={{ padding: '8px', margin: '6px' }} className={'user-prompt-card'}>
                            <a href="#" onClick={() => handleInsertPrompt(prompt)}>
                                <Flex justify="between" align="start" style={{ padding: '2px', minHeight: '33px' }}>
                                    <Text style={{ fontSize: '11px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                        {prompt.message}
                                    </Text>
                                    <IconButton
                                        variant="ghost"
                                        color="red"
                                        size="1"
                                        style={{ alignSelf: 'center' }}
                                        onClick={(e) => handleDeletePrompt(e, prompt)}>
                                        <TrashIcon />
                                    </IconButton>
                                </Flex>
                            </a>
                        </Card>
                    ))}
                    {userPromptList.length === 0 && (
                        <Text style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                            No saved prompts yet
                        </Text>
                    )}
                </Box>
            </ScrollArea>
            <Box style={{ marginTop: '16px' }}>
                <Button
                    className={'user-prompt-library-add-button'}
                    onClick={handleAddPrompt}
                    variant="soft"
                    size="1"
                    style={{ width: '100%' }}>
                    Add New Prompt
                </Button>
            </Box>
        </>
    );
};