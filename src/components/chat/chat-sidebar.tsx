'use client';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import type { Chat } from '@/lib/types';
import { IconLogo } from '@/components/icons';
import { formatDistanceToNow } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
}

export default function ChatSidebar({ chats, activeChatId, onNewChat, onSelectChat }: ChatSidebarProps) {
  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <IconLogo className="size-5" />
          </div>
          <h1 className="text-lg font-semibold text-sidebar-foreground">Edwin</h1>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-0">
        <div className="p-2">
            <Button onClick={onNewChat} className="w-full"><Plus className="-ml-1" /> New Chat</Button>
        </div>
        <ScrollArea className="h-full">
            <SidebarMenu className="p-2 pt-0">
            {chats.map(chat => (
                <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton
                    onClick={() => onSelectChat(chat.id)}
                    isActive={chat.id === activeChatId}
                    className="h-auto py-2 justify-start"
                >
                    <div className="flex flex-col items-start gap-1 text-left">
                    <span className="truncate max-w-40">{chat.title}</span>
                    <span className="text-xs text-muted-foreground/80">{formatDistanceToNow(chat.createdAt, { addSuffix: true })}</span>
                    </div>
                </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
            </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
      </SidebarFooter>
    </>
  );
}
