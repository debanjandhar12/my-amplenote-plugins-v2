export function ThreadCard({ thread, onDelete, onClick, isDisabled }) {
  const { Card, Flex, Text, IconButton, Separator } = window.RadixUI;
  const { TrashIcon, Pencil1Icon, PlusIcon } = window.RadixIcons;
  const firstMessage = getThreadFirstMessage(thread);

  const handleClick = (e) => {
    e.preventDefault();
    if (isDisabled) return;
    onClick?.(thread.id);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    if (isDisabled) return;
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
        cursor: isDisabled ? 'not-allowed' : 'pointer'
      }}
      disabled={isDisabled}
      asChild
    >
      <a href="#" onClick={handleClick} className={'thread-card'}>
        <Flex direction="column" gap="2" style={{ flex: 1 }}>
          <Flex justify="between" align="center" style={{ marginBottom: '4px' }}>
            <Text size="4" weight="bold" trim="both" style={{ flex: 1, marginRight: '12px' }}>
              {thread.title || 'Untitled Thread'}
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
              <IconButton 
                onClick={handleDelete} 
                variant="solid" 
                size="1" 
                color="red"
                disabled={isDisabled}
              >
                <TrashIcon width={14} height={14} />
              </IconButton>
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
