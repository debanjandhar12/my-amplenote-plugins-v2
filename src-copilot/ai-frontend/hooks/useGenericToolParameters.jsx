import {truncate} from "lodash-es";

export const useGenericToolParameters = ({ args, status, result, addResult }) => {
    const [formData, setFormData] = React.useState({});
    const [formError, setFormError] = React.useState(null);

    const threadRuntime = AssistantUI.useThreadRuntime();
    const cancelFurtherLLMReply = () => {threadRuntime.cancelRun();};

    const abortControllerRef = React.useRef(new AbortController());
    React.useEffect(() => {
        if (status?.type === 'ended') {
            abortControllerRef.current.abort();
            abortControllerRef.current = new AbortController();
        }
    }, [status?.type]);

    const addResultWrapper = (input) => {
        if (typeof input === 'string') {
            addResult(truncate(input, { length: 14000, omission: '[truncated tool output]' }));
            return;
        }
        addResult(input);
    }

    return {
        args, 
        status, 
        result, 
        addResult: addResultWrapper, 
        formError, 
        setFormError,
        formData, 
        setFormData, 
        cancelFurtherLLMReply,
        signal: abortControllerRef.current.signal
    };
}