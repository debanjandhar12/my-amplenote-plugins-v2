// Based on https://github.com/Yonom/assistant-ui/blob/70ea4a87283d9dc34965ef9d9a80504a05ab8979/packages/react/src/ui/user-message.tsx
import {replaceParagraphTextInMarkdown} from "../../markdown/replaceParagraphTextInMarkdown.jsx";
import {ToolCategoryRegistry} from "../tools-core/registry/ToolCategoryRegistry.js";
import {ToolCategoryMentionComponent} from "./makeCustomMarkdownText.jsx";

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
    const [children, setChildren] = React.useState(null);

    React.useEffect(() => {
        const processText = async () => {
            let tempText = text;
            for (const categoryName of ToolCategoryRegistry.getAllCategoriesNames()) {
                const toolCategory = ToolCategoryRegistry.getCategory(categoryName);
                tempText = await replaceParagraphTextInMarkdown(tempText, (oldVal) => {
                    return oldVal.replace(new RegExp('@' + categoryName + '(\\s|$)', 'g'), '<toolcategorymention123XG>@' + categoryName + '</toolcategorymention123XG>$1');
                });
            }
            const tempChildren = tempText.split(' ').map((part, i) => {
                if (part.startsWith('<toolcategorymention123XG>') && part.endsWith('</toolcategorymention123XG>')) {
                    const toolCategory = ToolCategoryRegistry.getCategory(part.substring(part.indexOf('>@') + 2, part.lastIndexOf('<')));
                    return <ToolCategoryMentionComponent key={i} {...toolCategory}>{part.substring(part.indexOf('>@') + 2, part.lastIndexOf('<'))}</ToolCategoryMentionComponent>;
                }
                return i === 0 ? part : ' ' + part;
            });
            setChildren(tempChildren);
        };

        processText();
    }, [text]);

    return <div className="aui-md-p">
        {children}
    </div>
};

export { UserMessage };