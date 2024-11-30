import {USER_PROMPT_LIST_SETTING} from "../constants.js";

export const ChatInterfaceHeader = () => {
    // Fetch runtime and other assistant-ui contexts
    const runtime = AssistantUI.useAssistantRuntime();

    // New chat button functionality
    const onClickNewChat = React.useCallback(() => runtime.switchToNewThread(), [runtime]);

    const {Box, Tooltip, Button, Popover} = window.RadixUI;
    const {PlusIcon} = window.RadixIcons;
    return (
        <Box style={{
            display: 'flex', justifyContent: 'flex-end', paddingRight: '4px',
            position: 'sticky', top: 0, zIndex: '1000', backgroundColor: 'var(--color-background)'
        }}>
            <UserPromptLibraryPopover />
            <Tooltip content="New chat">
                <Button variant="ghost" size="1" style={{marginRight: '4px', margin: '2px'}}
                                onClick={onClickNewChat}>
                    <PlusIcon />
                </Button>
            </Tooltip>
        </Box>
    )
}

const UserPromptLibraryPopover = () => {
    const composer = AssistantUI.useComposerRuntime();
    const [userPromptList, setUserPromptList] = React.useState([]);

    React.useEffect(() => {
        (async () => {
            try {
                setUserPromptList(JSON.parse((await window.appConnector.getSettings())[USER_PROMPT_LIST_SETTING]).sort((a, b) => b.usageCount - a.usageCount));
            } catch (e) {
                console.error(e);
            }
        })();
    }, []);

    const handleInsertPrompt = React.useCallback((prompt) => {
        composer.setText(prompt.message);
        // composer.focus(); // TODO: Fix this
        const newPromptList = userPromptList.map(prompt2 => {
            if(prompt2.uuid === prompt.uuid) return { ...prompt, usageCount: prompt.usageCount + 1 };
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

    const {Popover, Button, Tooltip, ScrollArea, Text, Box, Card, Flex, IconButton} = window.RadixUI;
    const {Pencil2Icon, TrashIcon} = window.RadixIcons;
    return (
        <Popover.Root>
            <Popover.Trigger asChild>
                <Button variant="ghost" size="1" style={{margin: '2px'}}>
                    <Tooltip content="User prompts">
                        <Pencil2Icon />
                    </Tooltip>
                </Button>
            </Popover.Trigger>
            <Popover.Content width="360px">
                <ScrollArea style={{ maxHeight: '320px' }}>
                    <Box style={{ padding: '8px' }}>
                        {userPromptList.map((prompt) => (
                            <Card asChild key={prompt.uuid} style={{ padding: '8px', margin: '6px' }}>
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
                            <Text style={{textAlign: 'center', color: 'var(--color-text-muted)'}}>
                                No saved prompts yet
                            </Text>
                        )}
                    </Box>
                </ScrollArea>
                <Box style={{marginTop: '16px'}}>
                    <Button
                        onClick={handleAddPrompt}
                        variant="soft"
                        size="1"
                        style={{ width: '100%' }}>
                        Add New Prompt
                    </Button>
                </Box>
            </Popover.Content>
        </Popover.Root>
    )
}