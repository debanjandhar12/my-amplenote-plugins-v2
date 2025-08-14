import {truncate} from "lodash-es";
import { MAX_TOOL_RESULT_LENGTH1 } from "../../constants.js";
import {truncateObjectVal} from "../helpers/truncateObjectVal.js";

export const useGenericToolParameters = ({ toolName, toolCallId, description, parameters,
                                             args, status, result, addResult }) => {
    const [formData, setFormData] = React.useState({});
    const [formError, setFormError] = React.useState(null);

    const threadRuntime = AssistantUI.useThreadRuntime();

    const abortControllerRef = React.useRef(new AbortController());
    React.useEffect(() => {
        if (status?.type === 'ended') {
            abortControllerRef.current.abort();
            abortControllerRef.current = new AbortController();
        }
    }, [status?.type]);

    const addResultWrapper = (input, toolResultLengthLimit = MAX_TOOL_RESULT_LENGTH1) => {
        if (typeof input === 'string') {
            return addResult(truncate(input, { length: toolResultLengthLimit, omission: '[truncated tool output]' }));
        }
        else if (typeof input === 'object') {
            const inputJSON = JSON.stringify(input);
            if (inputJSON.length > toolResultLengthLimit) {
                return addResult(truncateObjectVal(input, toolResultLengthLimit, '[truncated tool output]'));
            }
        }
        return addResult(input);
    }

    return {
        toolName,
        toolCallId,
        description,
        parameters,
        args, 
        status, 
        result, 
        addResult: addResultWrapper, 
        formError, 
        setFormError,
        formData, 
        setFormData,
        threadRuntime,
        signal: abortControllerRef.current.signal
    };
}