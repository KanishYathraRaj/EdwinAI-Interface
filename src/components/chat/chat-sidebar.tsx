'use client';
import { Edit, Search, User, MoreHorizontal, Share, Trash2, Pencil, Bot, LogOut } from 'lucide-react';
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
import type { Subject } from '@/lib/types';
import { IconLogo } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { NewSubjectDialog } from './new-subject-dialog';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

interface ChatSidebarProps {
  chats: Subject[];
  activeChatId: string | null;
  onNewSubject: (title: string, file: File | null) => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onSelectGeneral: () => void;
  isLoading: boolean;
}

export default function ChatSidebar({
  chats,
  activeChatId,
  onNewSubject,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onSelectGeneral,
  isLoading
}: ChatSidebarProps) {
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const [renameChatId, setRenameChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isNewSubjectDialogOpen, setIsNewSubjectDialogOpen] = useState(false);
  const { state } = useSidebar();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/login');
  };

  const filteredChats = chats.filter(chat =>
    chat.subject_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <SidebarHeader className="h-auto p-4 border-0">
        <div className="flex items-center justify-between w-full">
          <div className={cn("flex items-center gap-2 text-sidebar-foreground", state === 'collapsed' && "hidden")}>
            <IconLogo className="size-6" />
            <span className="text-lg font-semibold">EdwinAI</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={cn(state === 'collapsed' && "hidden")}>
              <ThemeToggle />
            </div>
            <SidebarTrigger className={cn("size-7 opacity-0 group-hover:opacity-100", state === 'collapsed' ? 'absolute left-1/2 top-3 -translate-x-1/2 opacity-100' : '')} />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-0">
        <div className="px-2 pb-4 space-y-2">
          <SidebarMenu className="p-0">
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={onSelectGeneral}
                isActive={activeChatId === null}
                className="w-full justify-start h-10 px-3 rounded-md bg-transparent transition-colors hover:bg-sidebar-accent/50 data-[active=true]:bg-sidebar-accent"
                tooltip="General"
              >
                <Bot size={18} />
                <span className="group-data-[collapsible=icon]:hidden">General Project</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setIsNewSubjectDialogOpen(true)} className="w-full justify-start h-10 px-3 rounded-md bg-transparent transition-colors hover:bg-sidebar-accent/50" tooltip="New subject">
                <Pencil size={18} />
                <span className="group-data-[collapsible=icon]:hidden">New subject</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setIsSearchActive(!isSearchActive)}
                className={cn("w-full justify-start h-10 px-3 rounded-md bg-transparent transition-colors hover:bg-sidebar-accent/50", isSearchActive && "bg-sidebar-accent")}
                tooltip="Search"
              >
                <Search size={18} />
                <span className="group-data-[collapsible=icon]:hidden">Search</span>
              </SidebarMenuButton>
              {isSearchActive && state !== 'collapsed' && (
                <div className="px-3 pb-2 animate-in slide-in-from-top-1 duration-200">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-sidebar-foreground/50" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Search subjects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-8 pl-8 pr-3 text-sm bg-sidebar-accent/50 rounded-md border-none focus:ring-1 focus:ring-sidebar-ring outline-none"
                    />
                  </div>
                </div>
              )}
            </SidebarMenuItem>
          </SidebarMenu>
        </div>

        {isLoading ? (
          <div className="px-4 group-data-[collapsible=icon]:hidden">
            <p className="px-3 text-sm text-sidebar-foreground/50">Loading subjects...</p>
          </div>
        ) : chats.length > 0 ? (
          <>
            <div className="px-4 mb-2 group-data-[collapsible=icon]:hidden">
              <p className="px-3 text-xs text-sidebar-foreground/50 font-semibold">Subjects</p>
            </div>

            <ScrollArea className="flex-1 overflow-y-auto">
              <SidebarMenu className="p-2 pt-0">
                {filteredChats.map(chat => (
                  <SidebarMenuItem key={chat.id}>
                    <div className="relative w-full group/item">
                      <SidebarMenuButton
                        onClick={() => onSelectChat(chat.id)}
                        isActive={chat.id === activeChatId}
                        className="h-10 justify-start rounded-md bg-transparent transition-colors hover:bg-sidebar-accent/50 data-[active=true]:bg-sidebar-accent w-full"
                        tooltip={chat.subject_name}
                      >
                        <span className="truncate max-w-48 group-data-[collapsible=icon]:hidden">{chat.subject_name}</span>
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
                            <DropdownMenuItem
                              onClick={() => {
                                setRenameChatId(chat.id);
                                setRenameValue(chat.subject_name);
                              }}
                              className="focus:bg-sidebar-accent"
                            >
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center justify-between w-full p-2 rounded-md transition-colors hover:bg-sidebar-accent/50 cursor-pointer group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center">
              <div className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarImage src={user?.photoURL || "https://picsum.photos/seed/avatar/32/32"} data-ai-hint="profile picture" />
                  <AvatarFallback>
                    <User size={18} />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden">
                  <span className="font-semibold text-sidebar-foreground">{user?.displayName || user?.email || 'Anonymous'}</span>
                  <span className="text-sidebar-foreground/60">Free</span>
                </div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-48 bg-card border-sidebar-border text-card-foreground">
            <DropdownMenuItem onClick={handleSignOut} className="focus:bg-sidebar-accent">
              <LogOut size={16} className="mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <AlertDialog open={!!deleteChatId} onOpenChange={(open) => !open && setDeleteChatId(null)}>
        <AlertDialogContent className="bg-card border-sidebar-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the subject and all its history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-sidebar-accent border-sidebar-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteChatId) {
                  onDeleteChat(deleteChatId);
                  setDeleteChatId(null);
                }
              }}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!renameChatId} onOpenChange={(open) => !open && setRenameChatId(null)}>
        <AlertDialogContent className="bg-card border-sidebar-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Subject</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Enter a new name for this subject.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <input
              autoFocus
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameChatId && renameValue.trim()) {
                  onRenameChat(renameChatId, renameValue.trim());
                  setRenameChatId(null);
                }
              }}
              className="w-full h-10 px-3 rounded-md bg-sidebar-accent/50 border border-sidebar-border outline-none focus:ring-1 focus:ring-sidebar-ring text-sidebar-foreground"
              placeholder="Subject name"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-sidebar-accent border-sidebar-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (renameChatId && renameValue.trim()) {
                  onRenameChat(renameChatId, renameValue.trim());
                  setRenameChatId(null);
                }
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Rename
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NewSubjectDialog
        open={isNewSubjectDialogOpen}
        onOpenChange={setIsNewSubjectDialogOpen}
        onSubjectCreate={(title, file) => {
          onNewSubject(title, file);
          setIsNewSubjectDialogOpen(false);
        }}
      />
    </>
  );
}
