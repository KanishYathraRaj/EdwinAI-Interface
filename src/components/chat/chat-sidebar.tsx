'use client';
import { Archive, ArrowUp, Edit, Search, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger
} from '@/components/ui/sidebar';
import type { Chat } from '@/lib/types';
import { IconLogo } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
}

export default function ChatSidebar({ chats, activeChatId, onNewChat, onSelectChat }: ChatSidebarProps) {
  const recentChats = chats.slice(0, 9);
  
  return (
    <>
      <SidebarHeader className="h-auto p-4 border-0">
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sidebar-foreground">
                <IconLogo className="size-6" />
                <span className="font-semibold">New chat</span>
            </div>
            <SidebarTrigger className="size-7" />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-0">
        <div className="px-4 pb-4 space-y-2">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input placeholder="Search chats" className="w-full h-10 rounded-full bg-sidebar-accent pl-10 pr-4 text-sm" />
            </div>
            <button className="w-full flex items-center h-10 px-3 rounded-full bg-sidebar-accent text-sidebar-foreground/80 hover:bg-sidebar-accent/80">
                <Archive size={18} className="mr-3"/>
                <span className="text-sm">Library</span>
            </button>
        </div>

        <div className="px-4 mb-2">
            <p className="px-3 text-xs text-sidebar-foreground/50 font-semibold">Chats</p>
        </div>

        <ScrollArea className="h-full">
            <SidebarMenu className="p-2 pt-0">
            {recentChats.map(chat => (
                <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton
                    onClick={() => onSelectChat(chat.id)}
                    isActive={chat.id === activeChatId}
                    className="h-10 justify-start rounded-full bg-transparent hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent"
                >
                    <div className="flex flex-col items-start gap-1 text-left">
                    <span className="truncate max-w-48">{chat.title}</span>
                    </div>
                </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
            </SidebarMenu>
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border/50">
        <div className="flex items-center justify-between w-full p-2 rounded-md hover:bg-sidebar-accent cursor-pointer">
            <div className="flex items-center gap-3">
                <Avatar className="size-8">
                    <AvatarImage src="https://picsum.photos/seed/avatar/32/32" data-ai-hint="profile picture" />
                    <AvatarFallback>
                        <User size={18} />
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm">
                    <span className="font-semibold text-sidebar-foreground">Kanish Yathra Raj</span>
                    <span className="text-sidebar-foreground/60">Free</span>
                </div>
            </div>
        </div>
        <Button variant="outline" className="w-full h-10 bg-transparent border-sidebar-border/50 text-sidebar-foreground justify-start gap-2 hover:bg-sidebar-accent hover:text-sidebar-foreground">
            <ArrowUp size={16} className="bg-green-500 text-white rounded-full p-0.5" />
            Upgrade your plan
        </Button>
      </SidebarFooter>
    </>
  );
}
