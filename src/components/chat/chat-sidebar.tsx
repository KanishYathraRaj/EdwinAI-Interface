'use client';
import { Archive, Edit, Search, User, MoreHorizontal, Share, Folder, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import type { Chat } from '@/lib/types';
import { IconLogo } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
}

export default function ChatSidebar({ chats, activeChatId, onNewChat, onSelectChat, onDeleteChat }: ChatSidebarProps) {
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const { state } = useSidebar();
  
  return (
    <>
      <SidebarHeader className="h-auto p-4 border-0">
        <div className="flex items-center justify-between w-full">
            <div className={cn("flex items-center gap-2 text-sidebar-foreground", state === 'collapsed' && "hidden")}>
                <IconLogo className="size-6" />
                <span className="text-lg font-semibold">ChatGPT</span>
            </div>
            <SidebarTrigger className={cn("size-7", state === 'expanded' && 'hidden group-hover:block')} />
            <SidebarTrigger className={cn("size-7", state === 'collapsed' && 'absolute left-1/2 -translate-x-1/2 top-3 opacity-0 group-hover:opacity-100')} />
        </div>
      </SidebarHeader>
      <SidebarContent className="p-0">
        <div className="px-2 pb-4 space-y-2">
            <SidebarMenu className="p-0">
              <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
                <Button onClick={onNewChat} variant="ghost" className="w-full justify-start h-10 px-3 rounded-md bg-transparent hover:bg-sidebar-accent">
                    <Pencil size={18} />
                    <span>New chat</span>
                </Button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="w-full justify-start h-10 px-3 rounded-md bg-transparent hover:bg-sidebar-accent" tooltip="Search">
                    <Search size={18} />
                    <span className="group-data-[collapsible=icon]:hidden">Search</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="w-full justify-start h-10 px-3 rounded-md bg-transparent hover:bg-sidebar-accent" tooltip="Library">
                    <Archive size={18}/>
                    <span className="group-data-[collapsible=icon]:hidden">Library</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
        </div>

        {chats.length > 0 ? (
          <>
            <div className="px-4 mb-2 group-data-[collapsible=icon]:hidden">
                <p className="px-3 text-xs text-sidebar-foreground/50 font-semibold">Chats</p>
            </div>

            <ScrollArea className="h-full">
                <SidebarMenu className="p-2 pt-0">
                {chats.map(chat => (
                    <SidebarMenuItem key={chat.id}>
                      <div className="relative w-full group/item">
                        <SidebarMenuButton
                            onClick={() => onSelectChat(chat.id)}
                            isActive={chat.id === activeChatId}
                            className="h-10 justify-start rounded-md bg-transparent hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent w-full"
                            tooltip={chat.title}
                        >
                            <span className="truncate max-w-48 group-data-[collapsible=icon]:hidden">{chat.title}</span>
                        </SidebarMenuButton>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity group-data-[collapsible=icon]:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7 hover:bg-sidebar-accent/50">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="bottom" align="start" className="w-48 bg-card border-sidebar-border text-card-foreground">
                              <DropdownMenuItem className="focus:bg-sidebar-accent">
                                <Share size={16} className="mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem className="focus:bg-sidebar-accent">
                                <Edit size={16} className="mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-sidebar-border" />
                              <DropdownMenuItem 
                                onClick={() => setDeleteChatId(chat.id)}
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
          <div className="px-4 group-data-[collapsible=icon]:hidden">
            <p className="px-3 text-sm text-sidebar-foreground/50">No history</p>
          </div>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border/50">
        <div className="flex items-center justify-between w-full p-2 rounded-md hover:bg-sidebar-accent cursor-pointer group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center">
            <div className="flex items-center gap-3">
                <Avatar className="size-8">
                    <AvatarImage src="https://picsum.photos/seed/avatar/32/32" data-ai-hint="profile picture" />
                    <AvatarFallback>
                        <User size={18} />
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden">
                    <span className="font-semibold text-sidebar-foreground">Kanish Yathra Raj</span>
                    <span className="text-sidebar-foreground/60">Free</span>
                </div>
            </div>
        </div>
      </SidebarFooter>

      <AlertDialog open={!!deleteChatId} onOpenChange={(open) => !open && setDeleteChatId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the chat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteChatId) {
                  onDeleteChat(deleteChatId);
                  setDeleteChatId(null);
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
