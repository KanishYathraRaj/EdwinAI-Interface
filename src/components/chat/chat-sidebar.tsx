'use client';
import { Archive, Edit, Search, User, MoreHorizontal, Share, Folder, Trash2, Pencil } from 'lucide-react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

export default function ChatSidebar({ chats, activeChatId, onNewChat, onSelectChat, onDeleteChat }: ChatSidebarProps) {
  const recentChats = chats.slice(0, 9);
  
  return (
    <>
      <SidebarHeader className="h-auto p-4 border-0">
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sidebar-foreground">
                <IconLogo className="size-6" />
            </div>
            <SidebarTrigger className="size-7" />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-0">
        <div className="px-4 pb-4 space-y-2">
            <button onClick={onNewChat} className="w-full flex items-center h-10 px-3 rounded-full bg-sidebar-accent text-sidebar-foreground/80 hover:bg-sidebar-accent/80">
                <Pencil size={18} className="mr-3"/>
                <span className="text-sm">New chat</span>
            </button>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input placeholder="Search chats" className="w-full h-10 rounded-full bg-sidebar-accent pl-10 pr-4 text-sm" />
            </div>
            <button className="w-full flex items-center h-10 px-3 rounded-full bg-sidebar-accent text-sidebar-foreground/80 hover:bg-sidebar-accent/80">
                <Archive size={18} className="mr-3"/>
                <span className="text-sm">Library</span>
            </button>
        </div>

        {chats.length > 0 ? (
          <>
            <div className="px-4 mb-2">
                <p className="px-3 text-xs text-sidebar-foreground/50 font-semibold">Chats</p>
            </div>

            <ScrollArea className="h-full">
                <SidebarMenu className="p-2 pt-0">
                {recentChats.map(chat => (
                    <SidebarMenuItem key={chat.id}>
                      <div className="relative w-full group">
                        <SidebarMenuButton
                            onClick={() => onSelectChat(chat.id)}
                            isActive={chat.id === activeChatId}
                            className="h-10 justify-start rounded-full bg-transparent hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent w-full"
                        >
                            <div className="flex flex-col items-start gap-1 text-left">
                            <span className="truncate max-w-48">{chat.title}</span>
                            </div>
                        </SidebarMenuButton>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7 hover:bg-sidebar-accent/50">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="bottom" align="start" className="w-56 bg-card border-sidebar-border text-card-foreground">
                              <DropdownMenuItem className="focus:bg-sidebar-accent">
                                <Share size={16} className="mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem className="focus:bg-sidebar-accent">
                                <Edit size={16} className="mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger className="focus:bg-sidebar-accent">
                                  <Folder size={16} className="mr-2" />
                                  Move to project
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="bg-card border-sidebar-border text-card-foreground">
                                  {/* Add project items here */}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                              <DropdownMenuSeparator className="bg-sidebar-border" />
                              <DropdownMenuItem className="focus:bg-sidebar-accent">
                                <Archive size={16} className="mr-2" />
                                Archive
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onDeleteChat(chat.id)}
                                className="text-red-500 focus:bg-red-500/10 focus:text-red-500"
                              >
                                <Trash2 size={16} className="mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </SidebarMenuItem>
                ))}
                </SidebarMenu>
            </ScrollArea>
          </>
        ) : (
          <div className="px-4">
            <p className="px-3 text-sm text-sidebar-foreground/50">No history</p>
          </div>
        )}
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
      </SidebarFooter>
    </>
  );
}
