import { Server } from 'socket.io';

declare module 'socket.io' {
  interface Server {
    emitToConversation: (conversationId: string, event: string, data: any) => void;
    emitToUser: (userId: string, event: string, data: any) => void;
    emitNewMessage: (message: any, conversationId: string) => void;
    emitConversationCreated: (conversationData: any, userId: string) => void;
    emitMessageUpdated: (message: any, conversationId: string) => void;
    emitMessageDeleted: (messageId: string, conversationId: string) => void;
    emitBatchMessagesDeleted: (messageIds: string[]) => void;
    emitMessageReactionUpdated: (conversationId: string, messageId: string, reactions: any) => void;
    getConnectedUsers: () => any[];
    isUserOnline: (userId: string) => boolean;
  }
}
