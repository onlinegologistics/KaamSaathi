import { mockUsers } from './mockUsers';

export interface ChatMessage {
  id: string;
  senderId: 'me' | string;
  text: string;
  time: string;
}

export interface ChatThread {
  userId: string;
  userName: string;
  avatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  messages: ChatMessage[];
}

export const mockChats: ChatThread[] = [
  {
    userId: mockUsers[0].id,
    userName: mockUsers[0].name,
    avatar: mockUsers[0].avatar as string,
    lastMessage: 'Can you come by 9am tomorrow?',
    lastTime: '10:24 AM',
    unread: 2,
    messages: [
      { id: 'm1', senderId: mockUsers[0].id, text: 'Hi, thanks for applying!', time: '10:10 AM' },
      { id: 'm2', senderId: 'me', text: 'Sure, happy to help.', time: '10:15 AM' },
      { id: 'm3', senderId: mockUsers[0].id, text: 'Can you come by 9am tomorrow?', time: '10:24 AM' },
    ],
  },
  {
    userId: mockUsers[1].id,
    userName: mockUsers[1].name,
    avatar: mockUsers[1].avatar as string,
    lastMessage: 'Great, see you then!',
    lastTime: 'Yesterday',
    unread: 0,
    messages: [
      { id: 'm1', senderId: 'me', text: 'I can start Monday evening.', time: 'Yesterday' },
      { id: 'm2', senderId: mockUsers[1].id, text: 'Great, see you then!', time: 'Yesterday' },
    ],
  },
  {
    userId: mockUsers[2].id,
    userName: mockUsers[2].name,
    avatar: mockUsers[2].avatar as string,
    lastMessage: 'Do you have your own bike?',
    lastTime: 'Mon',
    unread: 0,
    messages: [{ id: 'm1', senderId: mockUsers[2].id, text: 'Do you have your own bike?', time: 'Mon' }],
  },
];
