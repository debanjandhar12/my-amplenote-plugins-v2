import {ThreadCard} from './components/ThreadCard.jsx';
import {getChatAppContext} from "./context/ChatAppContext.jsx";
import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";

export function ChatHistoryOverlay() {
  const assistantRuntime = AssistantUI.useAssistantRuntime();
  const [allRemoteThreads, setAllRemoteThreads] = React.useState([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filteredThreads, setFilteredThreads] = React.useState([]);
  const { setIsChatHistoryOverlayOpen } = React.useContext(getChatAppContext());

  React.useEffect(() => {
    (async () => {
      try {
        const allRemoteThreads = await appConnector.getAllChatThreadsFromCopilotDB();
        setAllRemoteThreads(allRemoteThreads);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  React.useEffect(() => {
    const searchThreads = async () => {
      if (!searchTerm || searchTerm.trim() === '') {
        return setFilteredThreads(allRemoteThreads);
      }
      const fuse = window.fusejs || (await dynamicImportESM("fuse.js")).default;
      window.fusejs = fuse;
      const fuseObj = new fuse(allRemoteThreads, { keys: ['messages.messages.message.content.text'], threshold: 0.4 });
      setFilteredThreads(fuseObj.search(searchTerm, { limit: 10 }).map(result => result.item))
    }
    searchThreads();
  }, [allRemoteThreads, searchTerm]);

  const handleDeleteThread = async (threadId) => {
    await assistantRuntime.threads.getItemById(threadId).delete();
    const allRemoteThreads = await appConnector.getAllChatThreadsFromCopilotDB();
    setAllRemoteThreads(allRemoteThreads);
  }

  const handleSwitchToThread = async (threadId) => {
    await assistantRuntime.threads.switchToThread(threadId);
    setIsChatHistoryOverlayOpen(false);
  }

  const { Box, Flex, TextField, IconButton } = window.RadixUI;
  const { MagnifyingGlassIcon, Cross2Icon } = window.RadixIcons;

  return (
      <>
        {/* Inline style tag to define keyframes and the animation class */}
        <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .slide-in {
          animation: slideIn 0.12s ease-out;
        }
      `}</style>
        <Box
            className="slide-in"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(39, 47, 53,0.95)',
              zIndex: 2000
            }}
        >
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
                {searchTerm && (
                    <TextField.Slot style={{ paddingRight: '0px' }}>
                      <Cross2Icon
                          height="16"
                          width="16"
                          style={{
                            cursor: 'pointer',
                            opacity: 0.7,
                          }}
                          onClick={() => setSearchTerm('')}
                      />
                    </TextField.Slot>
                )}
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
                        isCurrentThread={thread.remoteId === assistantRuntime.threads.mainItem.getState().remoteId}
                        onClick={() => handleSwitchToThread(thread.remoteId)}
                        onDelete={() => handleDeleteThread(thread.remoteId)}
                    />
                ))}
              </Flex>
            </Box>
          </Box>
        </Box>
      </>
  );
}
