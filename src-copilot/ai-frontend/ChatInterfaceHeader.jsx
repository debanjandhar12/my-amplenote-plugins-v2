import {CUSTOM_PROMPT_SETTING} from "../constants.js";

export const ChatInterfaceHeader = () => {
    // Fetch runtime and other assistant-ui contexts
    const runtime = AssistantUI.useAssistantRuntime();

    // New chat button functionality
    const onClickNewChat = React.useCallback(() => runtime.switchToNewThread(), [runtime]);

    return (
        <RadixUI.Box style={{
            display: 'flex', justifyContent: 'flex-end', paddingRight: '4px',
            position: 'sticky', top: 0, zIndex: '1000', backgroundColor: 'var(--color-background)'
        }}>
            <UserPromptLibraryPopover />
            <RadixUI.Button variant="ghost" size="1" style={{marginRight: '4px', margin: '2px'}}
                            onClick={onClickNewChat}>
                <RadixIcons.PlusIcon />
            </RadixUI.Button>
        </RadixUI.Box>
    )
}

const UserPromptLibraryPopover = () => {
    const composer = AssistantUI.useComposerRuntime();
    const [userPromptList, setUserPromptList] = React.useState([]);

    React.useEffect(() => {
        (async () => {
            try {
                setUserPromptList(JSON.parse((await window.appConnector.getSettings())[CUSTOM_PROMPT_SETTING]));
            } catch (e) {
                console.error(e);
            }
        })();
    }, []);

    const handleInsertPrompt = React.useCallback((prompt) => {
        composer.setText(prompt.message);
        composer.focus(); // TODO: Fix this
    }, [composer]);

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
        await window.appConnector.setSetting(CUSTOM_PROMPT_SETTING, JSON.stringify([...userPromptList, promptObject]));
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
        await window.appConnector.setSetting(CUSTOM_PROMPT_SETTING, JSON.stringify(userPromptList.filter(p => p.uuid !== prompt.uuid)));
        setUserPromptList(userPromptList.filter(p => p.uuid !== prompt.uuid));
    }, [userPromptList]);

    return (
        <RadixUI.Popover.Root>
            <RadixUI.Popover.Trigger asChild>
                <RadixUI.Button variant="ghost" size="1" style={{margin: '2px'}}>
                    <RadixIcons.Pencil2Icon />
                </RadixUI.Button>
            </RadixUI.Popover.Trigger>
            <RadixUI.Popover.Content width="360px">
                <RadixUI.ScrollArea style={{ maxHeight: '320px' }}>
                    <RadixUI.Box style={{ padding: '8px' }}>
                        {userPromptList.map((prompt) => (
                            <RadixUI.Card asChild key={prompt.uuid} style={{ padding: '8px', margin: '6px' }}>
                                <a href="#" onClick={() => handleInsertPrompt(prompt)}>
                                    <RadixUI.Flex justify="between" align="start" style={{ padding: '2px', minHeight: '33px' }}>
                                        <RadixUI.Text style={{ fontSize: '11px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                            {prompt.message}
                                        </RadixUI.Text>
                                        <RadixUI.Button
                                            variant="ghost"
                                            color="red"
                                            size="1"
                                            style={{ alignSelf: 'center' }}
                                            onClick={(e) => handleDeletePrompt(e, prompt)}>
                                            <RadixIcons.TrashIcon />
                                        </RadixUI.Button>
                                    </RadixUI.Flex>
                                </a>
                            </RadixUI.Card>
                        ))}
                        {userPromptList.length === 0 && (
                            <RadixUI.Text style={{textAlign: 'center', color: 'var(--color-text-muted)'}}>
                                No saved prompts yet
                            </RadixUI.Text>
                        )}
                    </RadixUI.Box>
                </RadixUI.ScrollArea>
                <RadixUI.Box style={{marginTop: '16px'}}>
                    <RadixUI.Button
                        onClick={handleAddPrompt}
                        variant="soft"
                        size="1"
                        style={{ width: '100%' }}>
                        Add New Prompt
                    </RadixUI.Button>
                </RadixUI.Box>
            </RadixUI.Popover.Content>
        </RadixUI.Popover.Root>
    )
}