import dynamicImportESM, {dynamicImportCSS} from "../../../common-utils/dynamic-import-esm.js";
import {visit} from "unist-util-visit";
import {ToolCategoryRegistry} from "../tools-core/registry/ToolCategoryRegistry.js";

/**
 * This returns Markdown text component with following changes:
 * 1. Support for syntax highlighting
 * 2. Support for displaying tool category mentions
 * 3. Support for displaying toolplan tags
 * TODO - Make this a generic component
 */
export const makeCustomMarkdownText = ({overrideComponents, ...rest} = {}) => {
    const {makeMarkdownText} = window.AssistantUIMarkdown;

    return makeMarkdownText({
        components: {
            SyntaxHighlighter: ({code, components, language}) => {
                const {Pre, Code} = components;
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
                    <Code dangerouslySetInnerHTML={{__html: HighlightJS.highlight(code, {
                        language: HighlightJS.getLanguage(language) ?  language : 'plaintext',
                        }).value}} />}
                </Pre>
            },
            p: ({node, children, ...props}) => {
                // === Process children ===
                // It may have been better to process it as a rehype plugin and have a custom
                // component for it, but this is faster to build and works well enough.
                // This does have issue with things like: <toolplan>**a**</toolplan>
                const processToolplanTags = ((text) => {
                    // Delay rendering toolplan tags if tool is running
                    if (text.includes('<toolplan>') && !text.includes('</toolplan>')
                        && AssistantUI.useThread((t) => t.isRunning)) {
                        return null;
                    }
                    // Replace toolplan tags with components
                    const parts = text.split(/(<toolplan>.*?<\/toolplan>)/g);
                    return parts.map((part, i) => {
                        const toolplanMatch = part.match(/^<toolplan>(.*?)<\/toolplan>$/);
                        if (toolplanMatch) {
                            return <ToolPlanComponent key={i}>{toolplanMatch[1]}</ToolPlanComponent>;
                        }
                        return part;
                    });
                });
                const processToolCategoryMentionTags = (text) => {
                    const parts = text.split(' ');
                    const result = parts.map((part, i) => {
                        for (const categoryName of ToolCategoryRegistry.getAllCategoriesNames()) {
                            const toolCategory = ToolCategoryRegistry.getCategory(categoryName);
                            if (toolCategory && part === `@${toolCategory.name}`) {
                                return <ToolCategoryMentionComponent key={i} {...toolCategory}>{toolCategory.name}</ToolCategoryMentionComponent>;
                            }
                        }
                        return i === 0 ? part : ' ' + part;
                    });
                    return result;
                };
                children = Array.isArray(children)
                                ? children.map(child => {
                                                if (typeof child !== 'string') return child;
                                                return processToolplanTags(child);
                                })
                                : typeof children === 'string'
                                                ? processToolplanTags(children)
                                                : children;
                children = Array.isArray(children)
                                ? children.map(child => {
                                                if (typeof child !== 'string') return child;
                                                return processToolCategoryMentionTags(child);
                                })
                                : typeof children === 'string'
                                                ? processToolCategoryMentionTags(children)
                                                : children;

                return <div className="aui-md-p" {...props}>
                    {children}
                </div>
            },
            a: ({node, children, href, ...props}) => {
                return <a className="aui-md-a" {...props} href={href}
                          onClick={(e) => {
                              e.preventDefault();
                              window.appConnector.navigate(href);
                          }}>
                    {children}
                </a>
            },
            ...overrideComponents
        },
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

const ToolPlanComponent = ({ children }) => {
    const { Text, Box, Flex, Tooltip } = window.RadixUI;
return <Box className="aui-toolplan" style={{ border: '1px solid var(--gray-6)', padding: '4px 6px', marginBottom: '2px', opacity: 0.8, display: 'inline-block' }}>
        <Text size="1" style={{ color: 'var(--gray-11)' }}>
            Thinking execution plan...
        </Text>
        <Tooltip content={children}>
            <Text size="1" style={{ color: 'var(--gray-11)', cursor: 'help' }}>
                ⓘ
            </Text>
        </Tooltip>
    </Box>
};

export const ToolCategoryMentionComponent = ({ children, description }) => {
    const { Text, Tooltip, Popover } = window.RadixUI;
    return (
        <Popover.Root>
            <Tooltip content="Click to open tool category documentation">
                <Popover.Trigger asChild>
                    <Text as="a" className="tool_category_mention" style={{ cursor: 'pointer' }}>
                        @{children}
                    </Text>
                </Popover.Trigger>
            </Tooltip>
            <Popover.Content size="1" style={{ maxHeight: '140px', overflowY: 'auto',maxWidth: '260px' }}>
                <Text size="1" style={{ whiteSpace: 'pre-wrap' }} asChild>
                    <span dangerouslySetInnerHTML={{ __html: description }} />
                </Text>
            </Popover.Content>
        </Popover.Root>
    );
}