import {useDangerousInBrowserRuntimeMod} from "../hooks/useDangerousInBrowserRuntimeMod.jsx";
import {LLM_MAX_TOKENS_DEFAULT, LLM_MAX_TOKENS_SETTING} from "../../constants.js";
import {AmplenoteAttachmentAdapter} from "./AmplenoteAttachmentAdapter.jsx";
import {errorToString} from "../tools-core/utils/errorToString.js";

export const CustomAssistantRuntimeProvider = ({ children }) => {
    const innerRuntimeHook = React.useCallback(getInnerRuntime, []);

    const callbacksRef = React.useRef(new Set());
    const runtime = AssistantUI.unstable_useRemoteThreadListRuntime({
        runtimeHook: innerRuntimeHook,
        list: async () => {
            const remoteThreads = localStorage.getItem('copilot-threads');
            const parsedRemoteThreads = remoteThreads ? JSON.parse(remoteThreads) : [];
            return {
                threads: parsedRemoteThreads
            };
        },
        delete: async (threadId) => {
            const remoteThreads = localStorage.getItem('copilot-threads');
            const existingThreads = remoteThreads ? JSON.parse(remoteThreads) : [];
            const updatedThreads = existingThreads.filter((t) => t.id !== threadId);
            localStorage.setItem('assistant-threads', JSON.stringify(updatedThreads));
        },
        // TODO: Implement rename, archive, unarchive
        subscribe: (handler) => {
            callbacksRef.current.add(handler);
            // Return cleanup function to remove handler when component unmounts
            return () => callbacksRef.current.delete(handler);
        },
        initialize: async (threadId) => {
            const remoteThreads = localStorage.getItem('copilot-threads');
            const parsedRemoteThreads = remoteThreads ? JSON.parse(remoteThreads) : [];
            if (parsedRemoteThreads.find(t => t.remoteId === threadId)) {
                throw "Thread already exists in remote storage. Cannot initialize as new thread.";
            }
            const thread = {
                id: threadId,
                remoteId: threadId,
                name: `Copilot Chat - ${threadId}`,
                created: new Date().toISOString(),
                status: "regular"
            }
            localStorage.setItem('copilot-threads', JSON.stringify([...parsedRemoteThreads, thread]));
            return thread;
        }
    });

    const {AssistantRuntimeProvider} = window.AssistantUI;
    return (
        <AssistantRuntimeProvider runtime={runtime}>
            {children}
        </AssistantRuntimeProvider>
    );
}

const getInnerRuntime = () => {
    const runtime = useDangerousInBrowserRuntimeMod({
        model: window.LLM_MODEL,
        maxSteps: 4,
        maxTokens: appSettings[LLM_MAX_TOKENS_SETTING] || LLM_MAX_TOKENS_DEFAULT,
        adapters: {
            attachments: new AssistantUI.CompositeAttachmentAdapter([
                new AssistantUI.SimpleImageAttachmentAdapter(),
                new AssistantUI.SimpleTextAttachmentAdapter(),
                new AmplenoteAttachmentAdapter()
            ]),
        },
        onFinish: async (result) => {
            window.dispatchEvent(new CustomEvent('onLLMCallFinish', {detail: result}));
            console.log('onLLMCallFinish', result);
        },
        onError: async (error) => {
            appConnector.alert(`Error: ${errorToString(error)}`);
        }
    });

    return runtime;
}

export const useCustomChatHistory = () => {
    const assistantRuntime = AssistantUI.useAssistantRuntime();
    const threadRuntime = AssistantUI.useThreadRuntime();
    const threadListItemRuntime = AssistantUI.useThreadListItemRuntime();
    React.useEffect(() => {
        console.log('assistantRuntime', threadRuntime.getModelContext());
        (async () => {
            await new Promise(resolve => setTimeout(resolve, 1));
            await assistantRuntime.threads.switchToThread('__LOCALID_rJR0zhJ');
        })();
    }, [threadListItemRuntime]);

    threadRuntime.unstable_on("run-end", () => {
        const remoteThreads = localStorage.getItem('copilot-threads');
        const parsedRemoteThreads = remoteThreads ? JSON.parse(remoteThreads) : [];
        const remoteThreadItem = parsedRemoteThreads.find(t => t.id === threadListItemRuntime.getState().remoteId);
        if (remoteThreadItem) {
            remoteThreadItem.messages = threadRuntime.export();
            localStorage.setItem('copilot-threads', JSON.stringify(parsedRemoteThreads));
        }
    });
    threadListItemRuntime.subscribe(() => {
        const remoteThreads = localStorage.getItem('copilot-threads');
        const parsedRemoteThreads = remoteThreads ? JSON.parse(remoteThreads) : [];
        const remoteThreadItem = parsedRemoteThreads.find(t => t.id === threadListItemRuntime.getState().remoteId);
        if (remoteThreadItem) {
            threadRuntime.import(remoteThreadItem.messages);
        }
    });
}