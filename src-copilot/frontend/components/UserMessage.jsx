// Based on https://github.com/Yonom/assistant-ui/blob/70ea4a87283d9dc34965ef9d9a80504a05ab8979/packages/react/src/ui/user-message.tsx
import {replaceParagraphTextInMarkdown} from "../../markdown/replaceParagraphTextInMarkdown.jsx";
import {ToolCategoryRegistry} from "../tools-core/registry/ToolCategoryRegistry.js";

const UserMessage = () => {
    const { UserMessage, MessagePrimitive, UserActionBar, BranchPicker } = window.AssistantUI;
    return (
        <UserMessage.Root>
            <UserMessage.Attachments />
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
    const [htmlText, setHtmlText] = React.useState(null);

    React.useEffect(() => {
        const processText = async () => {
            let tempText = text;
            for (const categoryName of ToolCategoryRegistry.getAllCategoriesNames()) {
                const toolCategory = ToolCategoryRegistry.getCategory(categoryName);
                tempText = await replaceParagraphTextInMarkdown(tempText, (oldVal) => {
                    return oldVal.replaceAll('@' + categoryName, '<a class="user_msg_tool_category_mention" title="' + toolCategory.description + '" href="javascript:void(0)">@' + categoryName + '</a>');
                });
            }
            setHtmlText(tempText);
        };

        processText();
    }, [text]);

    return <div dangerouslySetInnerHTML={{ __html: htmlText }} />;
};

export { UserMessage };