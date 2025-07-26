// Based on https://github.com/Yonom/assistant-ui/blob/70ea4a87283d9dc34965ef9d9a80504a05ab8979/packages/react/src/ui/user-message.tsx
import { replaceParagraphTextInMarkdown } from "../../markdown/replaceParagraphTextInMarkdown.jsx";
import { ToolCategoryRegistry } from "../tools-core/registry/ToolCategoryRegistry.js";
import { ToolCategoryMentionComponent } from "./makeCustomMarkdownText.jsx";
import { FileAttachmentDisplay } from "./FileAttachmentDisplay.jsx";
import { getChatAppContext } from "../context/ChatAppContext.jsx";
import { processToolCategoryMentions } from "../helpers/tool-category-mentions.js";

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
    const { toolCategoryNames } = React.useContext(getChatAppContext());

    React.useEffect(() => {
        const processText = async () => {
            const result = processToolCategoryMentions(text, toolCategoryNames, (categoryName, mention) => {
                const toolCategory = ToolCategoryRegistry.getCategory(categoryName);
                return (
                    <ToolCategoryMentionComponent key={mention.start} {...toolCategory}>
                        {categoryName}
                    </ToolCategoryMentionComponent>
                );
            });
            
            setChildren(result);
        };

        processText();
    }, [text, toolCategoryNames]);

    return <div className="aui-md-p">
        {children}
    </div>
};

export { UserMessage };