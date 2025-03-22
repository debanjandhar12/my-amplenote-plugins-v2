import {truncate} from "lodash-es";

export function ThreadCard({ thread, onDelete, onClick, isCurrentThread }) {
  const { Card, Flex, Text, IconButton, Separator, Code } = window.RadixUI;
  const { TrashIcon, Pencil1Icon, PlusIcon, ChatBubbleIcon } = window.RadixIcons;
  const firstMessage = getThreadContent(thread);

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
        <Flex direction="column" gap="2" style={{flex: 1}}>
          <Flex justify="between" align="center" style={{marginBottom: '4px'}}>
            <Text size="4" weight="bold" trim="both" style={{flex: 1, marginRight: '12px'}}
                  color={isCurrentThread ? 'green' : false} truncate>
              <ChatBubbleIcon style={{marginRight: '4px'}}/>
              {thread.title?.trim() || 'Untitled Thread'}
            </Text>

            <Flex gap="3" align="center">
              <Text size="1" color="gray" style={{display: 'flex', alignItems: 'center'}}>
                <PlusIcon width={14} height={14} style={{marginRight: '2px'}}/>
                {new Date(thread.created).toLocaleDateString()} {new Date(thread.created).toLocaleTimeString()}
              </Text>
              <Separator orientation="vertical"/>
              <Text size="1" color="gray" style={{display: 'flex', alignItems: 'center'}}>
                <Pencil1Icon width={14} height={14} style={{marginRight: '2px'}}/>
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
                    <TrashIcon width={14} height={14}/>
                  </IconButton>
              }
            </Flex>
          </Flex>

          <p style={{margin: 0, color: '#666', fontSize: '14px', whiteSpace: 'pre-wrap', overflow: 'hidden'}}>
            {firstMessage}
          </p>
        </Flex>
      </a>
    </Card>
  );
}

const getThreadContent = (thread) => {
  if (!thread.messages) return 'No messages';
  if (thread.messages.length === 0) return 'No messages';
    let content = '';
    for (const message of thread.messages.messages) {
      console.log(message);
        content += `${message.message.role}: ${message.message.content.map(contentPart => contentPart.text).join('')}\n`;
    }
    return content;
}
