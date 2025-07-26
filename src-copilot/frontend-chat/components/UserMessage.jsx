// Based on https://github.com/Yonom/assistant-ui/blob/70ea4a87283d9dc34965ef9d9a80504a05ab8979/packages/react/src/ui/user-message.tsx
import { replaceParagraphTextInMarkdown } from "../../markdown/replaceParagraphTextInMarkdown.jsx";
import { ToolGroupRegistry } from "../tools-core/registry/ToolGroupRegistry.js";
import { ToolGroupMentionComponent } from "./makeCustomMarkdownText.jsx";
import { FileAttachmentDisplay } from "./FileAttachmentDisplay.jsx";
import { getChatAppContext } from "../context/ChatAppContext.jsx";
import { processToolGroupMentions } from "../helpers/tool-group-mentions.js";

const UserMessage = () => {
    const { UserMessage, MessagePrimitive, UserActionBar, BranchPicker } = window.AssistantUI;
    return (
        <UserMessage.Root>
            <UserMessage.Attachments components={{ File: FileAttachmentDisplay }} />
            <MessagePrimitive.If hasContent>
                <UserActionBar />
                <UserMessageContent />
            </MessagePrimitive.If>
            <BranchPicker />
        </UserMessage.Root>
    );
};

const UserMessageContentWrapper = ({ children, ...props }) => (
    <div className="aui-user-message-content" {...props}>
        {children}
    </div>
);

const UserMessageContent = (props) => {
    const { MessagePrimitive, ContentPart } = window.AssistantUI;
    return (
        <UserMessageContentWrapper {...props}>
            <MessagePrimitive.Content
                components={{
                    Text: UserMessageText,
                }}
            />
        </UserMessageContentWrapper>
    );
};

const UserMessageText = ({ text }) => {
    const [children, setChildren] = React.useState(null);
    const { toolGroupNames } = React.useContext(getChatAppContext());

    React.useEffect(() => {
        const processText = async () => {
            const result = processToolGroupMentions(text, toolGroupNames, (groupName, mention) => {
                const toolGroup = ToolGroupRegistry.getGroup(groupName);
                return (
                    <ToolGroupMentionComponent key={mention.start} {...toolGroup}>
                        {groupName}
                    </ToolGroupMentionComponent>
                );
            });
            
            setChildren(result);
        };

        processText();
    }, [text, toolGroupNames]);

    return <div className="aui-md-p">
        {children}
    </div>
};

export { UserMessage };