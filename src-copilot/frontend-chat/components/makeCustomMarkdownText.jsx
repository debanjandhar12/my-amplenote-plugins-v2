import dynamicImportESM, {
    dynamicImportCSS,
    dynamicImportExternalPluginBundle
} from "../../../common-utils/dynamic-import-esm.js";
import { visit } from "unist-util-visit";
import { ToolGroupRegistry } from "../tools-core/registry/ToolGroupRegistry.js";
import { getChatAppContext } from "../context/ChatAppContext.jsx";
import { processToolGroupMentions } from "../helpers/tool-group-mentions.js";

/**
 * This returns Markdown text component with following changes:
 * 1. Support for syntax highlighting
 * 2. Support for displaying tool group mentions
 * TODO - Make this a generic component
 */
export const makeCustomMarkdownText = async ({ overrideComponents, ...rest } = {}) => {
    const { makeMarkdownText } = window.AssistantUIMarkdown;
    let [remarkGfm] = await dynamicImportExternalPluginBundle('remarkBundle.js');
    return makeMarkdownText({
        components: {
            SyntaxHighlighter: ({ code, components, language }) => {
                const { Pre, Code } = components;
                const [HighlightJS, setHighlightJS] = React.useState(null);
                React.useEffect(() => {
                    const loadSyntaxHighlighter = async () => {
                        if (!HighlightJS) {
                            if (window.HighlightJS) {
                                setHighlightJS(window.HighlightJS);
                            } else {
                                await dynamicImportCSS("highlight.js/styles/github.css");
                                const hljs = await dynamicImportESM("highlight.js");
                                setHighlightJS(hljs.default);
                                window.HighlightJS = hljs.default;
                            }
                        }
                    };
                    loadSyntaxHighlighter();
                }, [HighlightJS]);

                return <Pre>
                    {HighlightJS === null ?
                        <Code>
                            {code}
                        </Code>
                        :
                        <Code dangerouslySetInnerHTML={{
                            __html: HighlightJS.highlight(code, {
                                language: HighlightJS.getLanguage(language) ? language : 'plaintext',
                            }).value
                        }} />}
                </Pre>
            },
            p: ({ node, children, ...props }) => {
                // === Process children ===
                // It may have been better to process it as a rehype plugin and have a custom
                // component for it, but this is faster to build and works well enough.
                const processToolGroupMentionTags = (text) => {
                    const { toolGroupNames } = React.useContext(getChatAppContext());

                    return processToolGroupMentions(text, toolGroupNames, (groupName, mention) => {
                        const toolGroup = ToolGroupRegistry.getGroup(groupName);
                        return (
                            <ToolGroupMentionComponent key={mention.start} {...toolGroup}>
                                {groupName}
                            </ToolGroupMentionComponent>
                        );
                    });
                };

                children = Array.isArray(children)
                    ? children.map(child => {
                        if (typeof child !== 'string') return child;
                        return processToolGroupMentionTags(child);
                    })
                    : typeof children === 'string'
                        ? processToolGroupMentionTags(children)
                        : children;

                return (
                    // pre-wrap added to preserve new lines
                    <div className="aui-md-p" {...props} style={{ ...props?.style, whiteSpace: 'pre-wrap' }}>
                        {children}
                    </div>
                );
            },
            a: ({ node, children, href, ...props }) => {
                return <a className="aui-md-a" {...props} href={href}
                    onClick={async (e) => {
                        e.preventDefault();
                        const isOpenSuccess = await appConnector.navigate(href);
                        if (!isOpenSuccess) {
                            appConnector.alert(`Failed to open link due to amplenote restrictions: ${href}` +
                                `\n\nPlease right click on the link and select "Open link in new tab".`);
                        }
                    }}>
                    {children}
                </a>
            },
            CodeHeader: ({ ...args }) => {
                return <AssistantUIMarkdown.CodeHeader {...args} />;
            },
            ...overrideComponents
        },
        remarkPlugins: [remarkGfm.default],
        rehypePlugins: [rehypeCompressTextNodes],
        ...rest
    });
}

const rehypeCompressTextNodes = () => {
    const isOfTypeText = (node) => node.type === 'text' || node.type === 'raw';
    return (tree) => {
        visit(tree, 'element', (node) => {
            if (!node.children) return;

            const compressedChildren = [];

            for (const child of node.children) {
                const lastChild = compressedChildren.slice(-1)[0];
                // Check if the current and previous child are both text nodes
                if (lastChild && isOfTypeText(lastChild) && isOfTypeText(child)) {
                    // Merge their values
                    lastChild.value += child.value;
                    lastChild.position = null; // Force rehype to recalculate position
                    lastChild.type = 'text';
                } else {
                    // Otherwise, push the current child as is
                    compressedChildren.push(child);
                }
            }
            node.children = compressedChildren;
        });
    };
};

export const ToolGroupMentionComponent = ({ children, description }) => {
    const { Text, Tooltip, Popover } = window.RadixUI;
    return (
        <Popover.Root>
            <Tooltip content="Click to open tool group documentation">
                <Popover.Trigger asChild>
                    <Text as="a" className="tool_group_mention" style={{ cursor: 'pointer' }}>
                        @{children}
                    </Text>
                </Popover.Trigger>
            </Tooltip>
            <Popover.Content size="1" style={{ maxHeight: '140px', overflowY: 'auto', maxWidth: '260px' }}>
                <Text size="1" style={{ whiteSpace: 'pre-wrap' }} asChild>
                    <span dangerouslySetInnerHTML={{ __html: description }} />
                </Text>
            </Popover.Content>
        </Popover.Root>
    );
}
