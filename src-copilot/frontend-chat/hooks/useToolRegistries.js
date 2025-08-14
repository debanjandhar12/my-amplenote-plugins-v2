import {ToolRegistry} from "../tools-core/registry/ToolRegistry.js";
import {ToolGroupRegistry} from "../tools-core/registry/ToolGroupRegistry.js";
import {errorToString} from "../helpers/errorToString.js";

export const useToolRegistries = () => {
    const [toolGroupNames, setToolGroupNames] = React.useState([]);
    const [tools, setTools] = React.useState([]);
    
    React.useEffect(() => {
        const initializeRegistries = async () => {
            try {
                await ToolRegistry.registerInbuiltTools();
                ToolGroupRegistry.updateAllGroups();
                setToolGroupNames(ToolGroupRegistry.getAllGroupNames());
                setTools(ToolRegistry.getAllTools());
                await ToolRegistry.registerMCPTools();
                ToolGroupRegistry.updateAllGroups();
                setToolGroupNames(ToolGroupRegistry.getAllGroupNames());
                setTools(ToolRegistry.getAllTools());
            } catch (e) {
                console.error("Failed to initialize tool registries:", e);
                appConnector.alert("Error: " + errorToString(e));
            }
        };
        initializeRegistries();
    }, []);
    
    return { toolGroupNames, tools };
}; 