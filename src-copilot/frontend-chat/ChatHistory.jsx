import {ThreadCard} from './components/ThreadCard.jsx';
import {CopilotChatHistoryDB} from "./helpers/CopilotChatHistoryDB.js";
import {getChatAppContext} from "./context/ChatAppContext.jsx";

export function ChatHistory() {
  const assistantRuntime = AssistantUI.useAssistantRuntime();
  const chatHistoryDB = new CopilotChatHistoryDB();
  const [allRemoteThreads, setAllRemoteThreads] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { setIsChatHistoryOverlayOpen } = React.useContext(getChatAppContext());

  React.useEffect(() => {
    (async () => {
      try {
        const allRemoteThreads = await chatHistoryDB.getAllThreads();
        setAllRemoteThreads(allRemoteThreads);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const filteredThreads = React.useMemo(() => {
    if (!searchTerm || searchTerm.trim() === '') return allRemoteThreads;
    return allRemoteThreads.filter(thread => {
      return thread.messages.some(message =>
        message.message.content.some(content =>
          content.type === 'text' && 
          content.text.toLowerCase().includes(searchTerm)
        )
      );
    });
  }, [allRemoteThreads, searchTerm]);

  const handleDeleteThread = async (threadId) => {
    await assistantRuntime.threads.getItemById(threadId).delete();
    const allRemoteThreads = await chatHistoryDB.getAllThreads();
    setAllRemoteThreads(allRemoteThreads);
  }

  const handleSwitchToThread = async (threadId) => {
    await assistantRuntime.threads.switchToThread(threadId);
    setIsChatHistoryOverlayOpen(false);
  }

  const { Box, Flex, TextField, IconButton } = window.RadixUI;
  const {MagnifyingGlassIcon, Cross2Icon} = window.RadixIcons;
  return (
    <Box style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(39, 47, 53,0.95)',
      zIndex: 2000
    }}>
      <Box style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <Flex align="center" gap="2" style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <IconButton
            variant="soft"
            onClick={() => setIsChatHistoryOverlayOpen(false)}
            style={{ padding: '6px', marginRight: '4px' }}
          >
            <Cross2Icon width={20} height={20} />
          </IconButton>
            <TextField.Root
                placeholder="Search chat history..."
                variant="soft"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '16px',
                  flex: 1
                }}
                className="search-input"
                autoFocus={true}
            >
              <TextField.Slot style={{ paddingLeft: '2px' }}>
                <MagnifyingGlassIcon height="16" width="16" />
              </TextField.Slot>
          </TextField.Root>
        </Flex>
        <Box style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px'
        }}>
          <Flex direction="column" gap="2">
            {filteredThreads.map(thread => (
                <ThreadCard
                    key={thread.remoteId}
                    thread={thread}
                    isDisabled={thread.remoteId === assistantRuntime.threads.mainItem.getState().remoteId}
                    onClick={() => handleSwitchToThread(thread.remoteId)}
                    onDelete={() => handleDeleteThread(thread.remoteId)}
                />
            ))}
          </Flex>
        </Box>
      </Box>
    </Box>
  );
}