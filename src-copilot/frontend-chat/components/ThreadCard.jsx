import {truncate} from "lodash-es";

export function ThreadCard({ thread, onDelete, onClick, isCurrentThread }) {
  const { Card, Flex, Text, IconButton, Separator, Code } = window.RadixUI;
  const { TrashIcon, Pencil1Icon, PlusIcon, ChatBubbleIcon } = window.RadixIcons;
  const firstMessage = getThreadFirstMessage(thread);

  const handleClick = (e) => {
    e.preventDefault();
    if (isCurrentThread) return;
    onClick?.(thread.id);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    if (isCurrentThread) return;
    onDelete?.(thread.id);
  };

  return (
    <Card 
      style={{
        padding: '12px',
        marginBottom: '4px',
        minHeight: '120px',
        maxHeight: '120px',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: isCurrentThread ? 'not-allowed' : 'pointer'
      }}
      disabled={isCurrentThread}
      asChild
    >
      <a href="#" onClick={handleClick} className={'thread-card'}>
        <Flex direction="column" gap="2" style={{ flex: 1 }}>
          <Flex justify="between" align="center" style={{ marginBottom: '4px' }}>
            <Text size="4" weight="bold" trim="both" style={{ flex: 1, marginRight: '12px' }} color={isCurrentThread ? 'green' : false} truncate>
              <ChatBubbleIcon style={{ marginRight: '4px' }} />
              {thread.title?.trim() || 'Untitled Thread'}
            </Text>
            
            <Flex gap="3" align="center">
              <Text size="1" color="gray" style={{ display: 'flex', alignItems: 'center' }}>
                <PlusIcon width={14} height={14} style={{ marginRight: '2px' }} />
                {new Date(thread.created).toLocaleDateString()} {new Date(thread.created).toLocaleTimeString()}
              </Text>
              <Separator orientation="vertical" />
              <Text size="1" color="gray" style={{ display: 'flex', alignItems: 'center' }}>
                <Pencil1Icon width={14} height={14} style={{ marginRight: '2px' }} />
                {new Date(thread.updated).toLocaleDateString()} {new Date(thread.updated).toLocaleTimeString()}
              </Text>
              {isCurrentThread ?
                  <Code size="1" color="green" variant="solid">
                    CURRENT
                  </Code>
                  :
                  <IconButton
                      onClick={handleDelete}
                      variant="solid"
                      size="1"
                      color="red">
                    <TrashIcon width={14} height={14} />
                  </IconButton>
              }
            </Flex>
          </Flex>

          <Text size="2" color="gray" trim="end" style={{ 
            lineClamp: 2,
            flex: 1,
            overflow: 'hidden'
          }}>
            {firstMessage || 'No messages'}
          </Text>
        </Flex>
      </a>
    </Card>
  );
}

const getThreadFirstMessage = (thread) => {
    return thread.messages ? JSON.stringify(thread.messages) : 'No messages';
}
