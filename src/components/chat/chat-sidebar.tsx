'use client';
import { Edit, User, MoreHorizontal, Trash2, LogOut, Home, Calendar, BookOpen, FolderPlus, Layers3, Loader2 } from 'lucide-react';
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
import type { Subject, Batch } from '@/types/database';
import { IconLogo } from '@/components/icons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { NewSubjectDialog } from './NewSubjectDialog';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

interface ChatSidebarProps {
  subjects: Subject[];
  batches: Batch[];
  activeId: string | null;
  activeType: 'subject' | 'batch' | 'home';
  onNewSubject: (title: string, file: File) => void;
  onNewBatch: (subjectId: string, details?: { batchName: string, startDate: string, endDate: string }) => void;
  onSelectSubject: (id: string) => void;
  onSelectBatch: (id: string) => void;
  onDeleteSubject: (id: string) => void;
  onDeleteBatch: (id: string) => void;
  onRenameSubject: (id: string, newTitle: string) => void;
  onSelectHome: () => void;
  isLoading: boolean;
}

export default function ChatSidebar({
  subjects,
  batches,
  activeId,
  activeType,
  onNewSubject,
  onNewBatch,
  onSelectSubject,
  onSelectBatch,
  onDeleteSubject,
  onDeleteBatch,
  onRenameSubject,
  onSelectHome,
  isLoading
}: ChatSidebarProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'subject' | 'batch' | null>(null);
  const [renameChatId, setRenameChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isNewSubjectDialogOpen, setIsNewSubjectDialogOpen] = useState(false);
  const { state } = useSidebar();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/login');
  };

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
                onClick={onSelectHome}
                isActive={activeType === 'home'}
                className="w-full justify-start h-10 px-3 rounded-md bg-transparent transition-colors hover:bg-sidebar-accent/50 data-[active=true]:bg-sidebar-accent"
                tooltip="Home"
              >
                <Home size={18} />
                <span className="group-data-[collapsible=icon]:hidden">Home</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setIsNewSubjectDialogOpen(true)} className="w-full justify-start h-10 px-3 rounded-md bg-transparent transition-colors hover:bg-sidebar-accent/50" tooltip="New subject">
                <FolderPlus size={18} />
                <span className="group-data-[collapsible=icon]:hidden">New Subject</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => router.push('/settings/scheduler')}
                className="w-full justify-start h-10 px-3 rounded-md bg-transparent transition-colors hover:bg-sidebar-accent/50"
                tooltip="Scheduler"
              >
                <Calendar size={18} />
                <span className="group-data-[collapsible=icon]:hidden">Scheduler</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>

        {isLoading ? (
          <div className="px-4 group-data-[collapsible=icon]:hidden">
            <p className="px-3 text-sm text-sidebar-foreground/50">Loading...</p>
          </div>
        ) : (
          <ScrollArea className="flex-1 overflow-y-auto">
            {/* Batches Section */}
            {batches.length > 0 && (
              <>
                <div className="px-4 mb-2 mt-4 group-data-[collapsible=icon]:hidden">
                  <p className="px-3 text-xs text-sidebar-foreground/50 font-semibold group-data-[collapsible=icon]:hidden">Batches</p>
                </div>
                <SidebarMenu className="p-2 pt-0">
                  {batches.map(batch => (
                    <SidebarMenuItem key={batch.id}>
                      <div className="relative w-full group/item">
                        <SidebarMenuButton
                          onClick={() => onSelectBatch(batch.id)}
                          isActive={activeId === (batch.slug || batch.id) && activeType === 'batch'}
                          className="h-10 justify-start rounded-md bg-transparent transition-colors hover:bg-sidebar-accent/50 data-[active=true]:bg-sidebar-accent w-full"
                          tooltip={batch.batch_name}
                        >
                          <Layers3 size={16} className="mr-2" />
                          <span className="truncate max-w-48 group-data-[collapsible=icon]:hidden">{batch.batch_name}</span>
                        </SidebarMenuButton>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity group-data-[collapsible=icon]:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7 hover:bg-sidebar-accent/50">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="bottom" align="start" className="w-48 bg-card border-sidebar-border text-card-foreground">
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeleteId(batch.id);
                                  setDeleteType('batch');
                                }}
                                className="text-red-500 focus:bg-red-500/10 focus:text-red-500"
                              >
                                <Trash2 size={16} className="mr-2" />
                                Delete Batch
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </>
            )}

            {/* Subjects Section */}
            {subjects.length > 0 && (
              <>
                <div className="px-4 mb-2 mt-6 group-data-[collapsible=icon]:hidden">
                  <p className="px-3 text-xs text-sidebar-foreground/50 font-semibold group-data-[collapsible=icon]:hidden">Subjects</p>
                </div>
                <SidebarMenu className="p-2 pt-0">
                  {subjects.map(subject => {
                    const isReady = subject.syllabus_status === 'ready' || !!subject.syllabus?.units?.length;
                    const isProcessing = !isReady;
                    return (
                    <SidebarMenuItem key={subject.id}>
                      <div className="relative w-full group/item">
                        <SidebarMenuButton
                          onClick={() => {
                            if (isProcessing) return;
                            onSelectSubject(subject.id);
                          }}
                          isActive={subject.id === activeId && activeType === 'subject'}
                          className={cn(
                            "h-10 justify-start rounded-md bg-transparent transition-colors hover:bg-sidebar-accent/50 data-[active=true]:bg-sidebar-accent w-full",
                            isProcessing && "opacity-70 cursor-not-allowed"
                          )}
                          tooltip={isProcessing ? `${subject.subject_name} (processing syllabus...)` : subject.subject_name}
                        >
                          <BookOpen size={16} className="mr-2" />
                          <span className="truncate max-w-48 group-data-[collapsible=icon]:hidden">{subject.subject_name}</span>
                          {isProcessing && <Loader2 size={14} className="ml-auto animate-spin text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden" />}
                        </SidebarMenuButton>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 transition-opacity group-data-[collapsible=icon]:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7 hover:bg-sidebar-accent/50">
                                <MoreHorizontal size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="bottom" align="start" className="w-48 bg-card border-sidebar-border text-card-foreground">
                              <DropdownMenuItem
                                onClick={() => onNewBatch(subject.id)}
                                className="focus:bg-sidebar-accent"
                              >
                                <Layers3 size={16} className="mr-2" />
                                Create Batch
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setRenameChatId(subject.id);
                                  setRenameValue(subject.subject_name);
                                }}
                                className="focus:bg-sidebar-accent"
                              >
                                <Edit size={16} className="mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-sidebar-border" />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeleteId(subject.id);
                                  setDeleteType('subject');
                                }}
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
                    );
                  })}
                </SidebarMenu>
              </>
            )}

            {(subjects.length === 0 && batches.length === 0) && (
              <div className="px-4 group-data-[collapsible=icon]:hidden">
                <p className="px-3 text-sm text-sidebar-foreground/50">No subjects yet</p>
              </div>
            )}
          </ScrollArea>
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border-sidebar-border text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              This will permanently delete the {deleteType === 'subject' ? 'subject' : 'batch'} and all its history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="hover:bg-sidebar-accent border-sidebar-border">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  if (deleteType === 'subject') onDeleteSubject(deleteId);
                  else if (deleteType === 'batch') onDeleteBatch(deleteId);
                  setDeleteId(null);
                  setDeleteType(null);
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
                  onRenameSubject(renameChatId, renameValue.trim());
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
                  onRenameSubject(renameChatId, renameValue.trim());
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
